import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, LoadingOverlay } from '../../components/common';
import { centeredContent } from '../../responsive';
import { toast } from '../../toast';
import { extractApiError, getHttpStatus } from '../../api/client';
import {
  useCreatePhoneChangeRequest, useVerifyPhoneChangeOtp, usePhoneChangeStatus,
} from '../../api/hooks/usePhoneChange';
import { useAuth } from '../../store/AuthContext';
import { userService } from '../../api/services/userService';
import { validatePhone } from '../../utils/validation';

type Step = 'newPhone' | 'otp' | 'done';

const RESEND_COOLDOWN = 60;

export default function PhoneChangeScreen({ navigation }: any) {
  const { data: existing, isLoading } = usePhoneChangeStatus();
  const { updateUser } = useAuth();
  const createRequest = useCreatePhoneChangeRequest();
  const verifyOtp = useVerifyPhoneChangeOtp();

  const [step, setStep] = useState<Step>('newPhone');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Only an unverified request resumes mid-flow; a verified change applies immediately.
    if (existing?.status === 'PENDING_VERIFICATION') setStep('otp');
  }, [existing]);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ── Step 1: submit new phone ──────────────────────────────────────────────

  const handleSubmit = async () => {
    const err = validatePhone(newPhone.trim());
    if (err) { setErrors({ newPhone: err }); return; }
    setErrors({});
    try {
      await createRequest.mutateAsync({ newPhone: newPhone.trim() });
      startCooldown();
      toast.success('Verification code sent to your registered email.');
      setStep('otp');
    } catch (e) {
      const status = getHttpStatus(e);
      if (status === 409) {
        setErrors({ newPhone: extractApiError(e) || 'Phone already in use.' });
      } else {
        toast.error(extractApiError(e) || 'Failed to submit request.');
      }
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  const otpValue = otp.join('');

  const handleOtpChange = (text: string, idx: number) => {
    if (errors.otp) setErrors((e) => ({ ...e, otp: '' }));
    const digits = text.replace(/\D/g, '');
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
    if (otpValue.length < 6) { toast.error('Enter the 6-digit code.'); return; }
    setErrors({});
    try {
      await verifyOtp.mutateAsync({ otp: otpValue });
      try { updateUser(await userService.getMe()); } catch { /* non-blocking */ }
      toast.success('Your phone number has been updated.');
      setStep('done');
    } catch (e) {
      const status = getHttpStatus(e);
      if (status === 401 || status === 400) {
        setErrors({ otp: extractApiError(e) || 'Incorrect code.' });
      } else {
        toast.error(extractApiError(e) || 'Verification failed.');
      }
    }
  };

  const busy = createRequest.isPending || verifyOtp.isPending || isLoading;

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Change Phone" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Change Phone"
        onBack={() => {
          if (step === 'otp') { setStep('newPhone'); return; }
          navigation.goBack();
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, ...centeredContent }}>

        {/* ── Step 1 ── */}
        {step === 'newPhone' && (
          <>
            <Text style={styles.heading}>Request phone change</Text>
            <Text style={styles.sub}>
              Enter the new phone number. We'll send a verification code to your registered email
              to confirm this change, then update your phone right away.
            </Text>
            <AppInput
              label="New Phone Number"
              value={newPhone}
              onChangeText={(v) => { setNewPhone(v); if (errors.newPhone) setErrors({}); }}
              keyboardType="phone-pad"
              placeholder="10-digit mobile number"
              error={errors.newPhone}
            />
            <AppButton
              label="Send Verification Code"
              loading={createRequest.isPending}
              disabled={!newPhone.trim() || busy}
              onPress={handleSubmit}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 'otp' && (
          <>
            <Text style={styles.heading}>Verify your new phone</Text>
            <Text style={styles.sub}>
              Enter the 6-digit code sent to your registered email to confirm changing your number to{' '}
              <Text style={{ color: colors.primary }}>{existing?.newPhone ?? newPhone}</Text>
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
              disabled={cooldown > 0 || createRequest.isPending}
              onPress={handleSubmit}
            >
              <Text style={[styles.resendText, cooldown > 0 ? styles.resendDisabled : undefined]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Resend"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 3 ── */}
        {step === 'done' && (
          <>
            <View style={styles.pendingCard}>
              <Text style={styles.pendingIcon}>✅</Text>
              <Text style={styles.pendingTitle}>Phone updated</Text>
              <Text style={styles.pendingDesc}>
                Your account phone is now{'\n'}
                <Text style={{ color: colors.primary }}>{existing?.newPhone ?? newPhone}</Text>.
              </Text>
            </View>
            <AppButton label="Done" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
          </>
        )}

      </ScrollView>
      <LoadingOverlay visible={busy} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  heading: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
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
  pendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingIcon: { fontSize: 48, marginBottom: spacing.md },
  pendingTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  pendingDesc: { fontSize: fontSize.sm, color: colors.textMid, textAlign: 'center', lineHeight: 22 },
});
