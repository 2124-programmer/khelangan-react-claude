import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, LoadingOverlay } from '../../components/common';
import { toast } from '../../toast';
import { extractApiError, getHttpStatus } from '../../api/client';
import {
  useRequestPasswordReset, useVerifyPasswordResetOtp, useConfirmPasswordReset,
} from '../../api/hooks/usePasswordReset';
import { useAndroidBack } from '../../hooks/useAndroidBack';

type Step = 'email' | 'otp' | 'newPassword';

const OTP_EXPIRY_SECS = 600; // 10 min — mirrors backend OTP_EXPIRY_SEC
const RESEND_COOLDOWN = 45;  // mirrors backend OTP_RESEND_SEC

function meetsPolicy(pwd: string) {
  return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

export default function ForgotPasswordScreen({ navigation, route }: any) {
  const fromSecurity = route?.params?.fromSecurity === true;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  const requestReset = useRequestPasswordReset();
  const verifyOtp = useVerifyPasswordResetOtp();
  const confirmReset = useConfirmPasswordReset();

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = (secs: number) => {
    setCooldown(secs);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ── Step 1: send OTP ──────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!email.trim()) { setErrors({ email: 'Email is required' }); return; }
    setErrors({});
    try {
      await requestReset.mutateAsync({ email: email.trim().toLowerCase() });
      startCooldown(RESEND_COOLDOWN);
      toast.success('If that email is registered, a code has been sent.');
      setStep('otp');
    } catch (err) {
      toast.error(extractApiError(err) || 'Failed to send code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await requestReset.mutateAsync({ email: email.trim().toLowerCase() });
      startCooldown(RESEND_COOLDOWN);
      toast.info('A new code has been sent.');
    } catch (err) {
      toast.error(extractApiError(err) || 'Failed to resend.');
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  const otpValue = otp.join('');

  const handleOtpChange = (text: string, idx: number) => {
    if (errors.otp) setErrors((e) => ({ ...e, otp: '' }));
    const digits = text.replace(/\D/g, '');
    // Paste / SMS-style autofill: a 6-digit value lands in one box — spread it across the row.
    if (digits.length > 1) {
      const next = [...otp];
      for (let i = 0; i < digits.length && idx + i < 6; i++) next[idx + i] = digits[i];
      setOtp(next);
      const lastFilled = Math.min(idx + digits.length, 6) - 1;
      otpRefs.current[lastFilled]?.focus();
      return;
    }
    const char = digits.slice(-1);
    const next = [...otp];
    next[idx] = char;
    setOtp(next);
    if (char && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = '';
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otpValue.length < 6) { toast.error('Please enter the 6-digit code.'); return; }
    setErrors({});
    try {
      const res = await verifyOtp.mutateAsync({ email: email.trim().toLowerCase(), otp: otpValue });
      setResetToken(res.resetToken);
      setStep('newPassword');
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 401 || status === 400) {
        const msg = extractApiError(err);
        setErrors({ otp: msg || 'Incorrect code.' });
      } else {
        toast.error(extractApiError(err) || 'Verification failed. Please try again.');
      }
    }
  };

  // ── Step 3: set new password ──────────────────────────────────────────────

  const handleConfirm = async () => {
    const errs: Record<string, string> = {};
    if (!meetsPolicy(newPwd)) errs.newPwd = 'Min 8 chars, at least 1 letter and 1 digit.';
    if (newPwd !== confirmPwd) errs.confirmPwd = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      await confirmReset.mutateAsync({ resetToken, newPassword: newPwd });
      toast.success('Password reset successfully! Please log in with your new password.');
      if (fromSecurity) {
        navigation.goBack();
      } else {
        navigation.navigate('Login');
      }
    } catch (err) {
      toast.error(extractApiError(err) || 'Reset failed. The token may have expired — please try again.');
    }
  };

  const busy = requestReset.isPending || verifyOtp.isPending || confirmReset.isPending;

  // Step back within the flow before leaving the screen. Returns true when consumed
  // (used for both the header back button and the Android hardware-back press).
  const handleBack = useCallback((): boolean => {
    if (step === 'otp') { setStep('email'); return true; }
    if (step === 'newPassword') { setStep('otp'); return true; }
    return false; // on step 'email', let the default back leave the screen
  }, [step]);

  useAndroidBack(handleBack);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Reset Password"
        onBack={() => { if (!handleBack()) navigation.goBack(); }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>

        {/* Progress indicator */}
        <View style={styles.steps}>
          {(['email', 'otp', 'newPassword'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              <View style={[styles.dot, step === s && styles.dotActive, i < (['email', 'otp', 'newPassword'] as Step[]).indexOf(step) && styles.dotDone]} />
              {i < 2 && <View style={styles.line} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Step 1 ── */}
        {step === 'email' && (
          <>
            <Text style={styles.heading}>Forgot your password?</Text>
            <Text style={styles.sub}>Enter your account email and we'll send you a reset code.</Text>
            <AppInput
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); if (errors.email) setErrors({}); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="you@example.com"
              error={errors.email}
            />
            <AppButton
              label="Send Reset Code"
              loading={requestReset.isPending}
              disabled={!email.trim() || busy}
              onPress={handleSend}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 'otp' && (
          <>
            <Text style={styles.heading}>Enter the code</Text>
            <Text style={styles.sub}>
              A 6-digit code was sent to your email. It expires in {OTP_EXPIRY_SECS / 60} minutes.
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => { otpRefs.current[idx] = r; }}
                  style={[styles.otpBox, errors.otp ? styles.otpBoxError : undefined]}
                  value={digit}
                  onChangeText={(t) => handleOtpChange(t, idx)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                  keyboardType="number-pad"
                  maxLength={idx === 0 ? 6 : 1}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  selectTextOnFocus
                />
              ))}
            </View>
            {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}

            <AppButton
              label="Verify Code"
              loading={verifyOtp.isPending}
              disabled={otpValue.length < 6 || busy}
              onPress={handleVerify}
              style={{ marginTop: spacing.lg }}
            />

            <TouchableOpacity
              style={styles.resendRow}
              onPress={handleResend}
              disabled={cooldown > 0 || requestReset.isPending}
            >
              <Text style={[styles.resendText, cooldown > 0 ? styles.resendDisabled : undefined]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Resend"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 'newPassword' && (
          <>
            <Text style={styles.heading}>Set a new password</Text>
            <Text style={styles.sub}>Choose a strong password for your account.</Text>

            <AppInput
              label="New Password"
              value={newPwd}
              onChangeText={(v) => { setNewPwd(v); if (errors.newPwd) setErrors((e) => ({ ...e, newPwd: '' })); }}
              secureTextEntry={!showNew}
              error={errors.newPwd}
              rightElement={
                <TouchableOpacity onPress={() => setShowNew((s) => !s)}>
                  <Text style={styles.eye}>{showNew ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              }
            />
            {newPwd.length > 0 && (
              <View style={styles.hints}>
                <Hint ok={newPwd.length >= 8} label="At least 8 characters" />
                <Hint ok={/[a-zA-Z]/.test(newPwd)} label="At least 1 letter" />
                <Hint ok={/[0-9]/.test(newPwd)} label="At least 1 digit" />
              </View>
            )}

            <AppInput
              label="Confirm New Password"
              value={confirmPwd}
              onChangeText={(v) => { setConfirmPwd(v); if (errors.confirmPwd) setErrors((e) => ({ ...e, confirmPwd: '' })); }}
              secureTextEntry={!showConfirm}
              error={errors.confirmPwd}
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirm((s) => !s)}>
                  <Text style={styles.eye}>{showConfirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              }
            />

            <AppButton
              label="Reset Password"
              loading={confirmReset.isPending}
              disabled={!meetsPolicy(newPwd) || newPwd !== confirmPwd || busy}
              onPress={handleConfirm}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}

      </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={busy} />
    </SafeAreaView>
  );
}

function Hint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={[styles.hint, ok ? styles.hintOk : styles.hintFail]}>
      {ok ? '✓' : '○'} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, transform: [{ scale: 1.3 }] },
  dotDone: { backgroundColor: colors.primaryDark },
  line: { width: 40, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginBottom: spacing.xl, lineHeight: 20 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  otpBox: {
    width: 46, height: 56, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
    textAlign: 'center', fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text,
  },
  otpBoxError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginBottom: spacing.sm },
  resendRow: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.sm },
  resendText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  resendDisabled: { color: colors.textDim },
  eye: { fontSize: 18, padding: spacing.xs },
  hints: { marginBottom: spacing.md, paddingLeft: spacing.xs },
  hint: { fontSize: fontSize.xs, marginBottom: 2 },
  hintOk: { color: colors.success },
  hintFail: { color: colors.textDim },
});
