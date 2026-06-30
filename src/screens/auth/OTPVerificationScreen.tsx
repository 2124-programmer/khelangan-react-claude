import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppButton, AppHeader } from '../../components/common';
import { centeredContent } from '../../responsive';
import { authService } from '../../api/services/authService';
import { useAuth } from '../../store/AuthContext';
import { extractApiError } from '../../api/client';

export default function OTPVerificationScreen({ navigation, route }: any) {
  const email: string          = route?.params?.email ?? '';
  const maskedDest: string     = route?.params?.maskedDestination ?? 'your phone';
  const initialResend: number  = route?.params?.resendAfterSec ?? 60;

  const { updateSession } = useAuth();
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [resendSec, setResendSec] = useState(initialResend);
  const [resending, setResending] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  // Countdown timer
  useEffect(() => {
    if (resendSec <= 0) return;
    const id = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendSec]);

  const handleChange = (text: string, i: number) => {
    // Accept paste of full 6-digit code into the first box
    if (text.length === 6 && /^\d{6}$/.test(text)) {
      const digits = text.split('');
      setOtp(digits);
      inputs.current[5]?.focus();
      return;
    }
    const next = [...otp];
    next[i] = text.replace(/\D/g, '').slice(-1);
    setOtp(next);
    if (next[i] && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleBackspace = (key: string, i: number) => {
    if (key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOtp({ email, code });
      if (!res.token || !res.user) throw new Error('Invalid server response');
      await updateSession(res.token, res.user);
      // RootNavigator auto-routes to role home after updateSession
    } catch (err) {
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('Verification Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = useCallback(async () => {
    if (resendSec > 0 || resending) return;
    setResending(true);
    try {
      const res = await authService.sendOtp({ email });
      setResendSec(res.resendAfterSec > 0 ? res.resendAfterSec : 60);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err) {
      Alert.alert('Resend Failed', extractApiError(err));
    } finally {
      setResending(false);
    }
  }, [email, resendSec, resending]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Verify OTP" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.body, centeredContent]}>
        <Text style={styles.heading}>Enter verification code</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to{' '}
          <Text style={styles.dest}>{maskedDest}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
              keyboardType="numeric"
              maxLength={i === 0 ? 6 : 1}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              returnKeyType="done"
            />
          ))}
        </View>

        {resendSec > 0 ? (
          <Text style={styles.resendTimer}>
            Resend code in <Text style={styles.resendCount}>{formatCountdown(resendSec)}</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={[styles.resendLink, resending && styles.resendDisabled]}>
              {resending ? 'Sending…' : 'Resend code'}
            </Text>
          </TouchableOpacity>
        )}

        <AppButton
          label={loading ? 'Verifying…' : 'Verify & Continue'}
          onPress={handleVerify}
          loading={loading}
          disabled={!isComplete || loading}
          style={{ marginTop: spacing.xl }}
        />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs, lineHeight: 20 },
  dest: { fontWeight: fontWeight.semibold, color: colors.text },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl },
  otpBox: {
    width: 48, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, textAlign: 'center', fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  otpBoxFilled: { borderColor: colors.primary },
  resendTimer: {
    textAlign: 'center', color: colors.textDim, marginTop: spacing.xl, fontSize: fontSize.sm,
  },
  resendCount: { color: colors.text, fontWeight: fontWeight.semibold },
  resendLink: {
    textAlign: 'center', color: colors.primary, marginTop: spacing.xl,
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
  },
  resendDisabled: { opacity: 0.5 },
});
