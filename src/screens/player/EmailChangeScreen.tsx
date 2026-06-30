import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, LoadingOverlay } from '../../components/common';
import { toast } from '../../toast';
import { extractApiError, getHttpStatus } from '../../api/client';
import {
  useCreateEmailChangeRequest, useVerifyEmailChangeOtp, useEmailChangeStatus,
} from '../../api/hooks/useEmailChange';
import { useAuth } from '../../store/AuthContext';
import { userService } from '../../api/services/userService';

type Step = 'newEmail' | 'otp' | 'done';

const RESEND_COOLDOWN = 60;

const STATUS_COPY: Record<string, { label: string; color: string; desc: string }> = {
  PENDING_VERIFICATION: {
    label: 'Awaiting verification',
    color: colors.warning,
    desc: 'Enter the code sent to your new email to continue.',
  },
  APPROVED: {
    label: 'Approved',
    color: colors.success,
    desc: 'Your email address has been updated.',
  },
  REJECTED: {
    label: 'Rejected',
    color: colors.danger,
    desc: 'Your request was not approved. You may submit a new one.',
  },
};

export default function EmailChangeScreen({ navigation }: any) {
  const { data: existing, isLoading } = useEmailChangeStatus();
  const { updateUser } = useAuth();
  const createRequest = useCreateEmailChangeRequest();
  const verifyOtp = useVerifyEmailChangeOtp();

  const [step, setStep] = useState<Step>('newEmail');
  const [newEmail, setNewEmail] = useState('');
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

  // ── Step 1: submit new email ──────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!newEmail.trim() || !/\S+@\S+\.\S+/.test(newEmail)) {
      setErrors({ newEmail: 'Enter a valid email address.' });
      return;
    }
    setErrors({});
    try {
      await createRequest.mutateAsync({ newEmail: newEmail.trim().toLowerCase() });
      startCooldown();
      toast.success('Verification code sent to your new email.');
      setStep('otp');
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 409) {
        // Email already belongs to another account — surface it both inline and as a toast so it's
        // unmissable, and stay on step 1 (no OTP is sent for a taken address).
        const msg = extractApiError(err) || 'This email address is already in use by another account.';
        setErrors({ newEmail: msg });
        toast.error(msg);
      } else {
        toast.error(extractApiError(err) || 'Failed to submit request.');
      }
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────

  const otpValue = otp.join('');

  const handleOtpChange = (text: string, idx: number) => {
    if (errors.otp) setErrors((e) => ({ ...e, otp: '' }));
    const digits = text.replace(/\D/g, '');
    // Paste / autofill: a multi-digit value lands in one box — spread it across the row.
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
      // Self-service: the change is applied immediately. Refresh the signed-in user so the new
      // email shows everywhere (best-effort — the change already succeeded server-side).
      try { updateUser(await userService.getMe()); } catch { /* non-blocking */ }
      toast.success('Your email address has been updated.');
      setStep('done');
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 401 || status === 400) {
        setErrors({ otp: extractApiError(err) || 'Incorrect code.' });
      } else {
        toast.error(extractApiError(err) || 'Verification failed.');
      }
    }
  };

  const busy = createRequest.isPending || verifyOtp.isPending || isLoading;

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Change Email" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible />
      </SafeAreaView>
    );
  }

  const statusInfo = existing?.status ? STATUS_COPY[existing.status] : null;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Change Email"
        onBack={() => {
          if (step === 'otp') { setStep('newEmail'); return; }
          navigation.goBack();
        }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.xl }}>

        {/* Status banner if there's an existing resolved request */}
        {existing?.status && ['APPROVED', 'REJECTED'].includes(existing.status) && statusInfo && (
          <View style={[styles.statusBanner, { borderLeftColor: statusInfo.color }]}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            <Text style={styles.statusDesc}>{statusInfo.desc}</Text>
            {existing.reason ? (
              <Text style={styles.statusReason}>Reason: {existing.reason}</Text>
            ) : null}
          </View>
        )}

        {/* ── Step 1 ── */}
        {step === 'newEmail' && (
          <>
            <Text style={styles.heading}>Request email change</Text>
            <Text style={styles.sub}>
              Enter the new email address. We'll send a verification code to confirm it's yours,
              then update your email right away.
            </Text>
            <AppInput
              label="New Email Address"
              value={newEmail}
              onChangeText={(v) => { setNewEmail(v); if (errors.newEmail) setErrors({}); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="newaddress@example.com"
              error={errors.newEmail}
            />
            <AppButton
              label="Send Verification Code"
              loading={createRequest.isPending}
              disabled={!newEmail.trim() || busy}
              onPress={handleSubmit}
              style={{ marginTop: spacing.lg }}
            />
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 'otp' && (
          <>
            <Text style={styles.heading}>Verify your new email</Text>
            <Text style={styles.sub}>
              Enter the 6-digit code sent to{' '}
              <Text style={{ color: colors.primary }}>{existing?.newEmail ?? newEmail}</Text>
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
              <Text style={styles.pendingTitle}>Email updated</Text>
              <Text style={styles.pendingDesc}>
                Your account email is now{'\n'}
                <Text style={{ color: colors.primary }}>{existing?.newEmail ?? newEmail}</Text>.{'\n\n'}
                Use this address the next time you sign in.
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
  statusBanner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  statusLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 4 },
  statusDesc: { fontSize: fontSize.sm, color: colors.textMid },
  statusReason: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs, fontStyle: 'italic' },
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
