import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader, Toast, LoadingOverlay } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors, getHttpStatus, BASE_URL } from '../../api/client';
import { authService } from '../../api/services/authService';
import type { UserDto } from '../../api/types';
import {
  validateEmail, validateLoginPassword, collectErrors,
} from '../../utils/validation';

type ScreenState = 'idle' | 'loading' | 'success';

export default function LoginScreen({ navigation, route }: any) {
  const { loginWithCredentialsDeferred, updateSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [otpLoading, setOtpLoading] = useState(false);
  const pendingSession = useRef<{ token: string; user: UserDto } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const setFieldError = (field: string, err: string | null) =>
    setFieldErrors((prev) => ({ ...prev, [field]: err ?? '' }));

  const isFormValid = !validateEmail(email) && !validateLoginPassword(password);
  const isEmailValid = !validateEmail(email);
  const busy = screenState !== 'idle';

  const handleLogin = async () => {
    const errors = collectErrors([
      ['email', () => validateEmail(email)],
      ['password', () => validateLoginPassword(password)],
    ]);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setScreenState('loading');

    let result: { token: string; user: UserDto } | null = null;
    try {
      result = await loginWithCredentialsDeferred(email.trim().toLowerCase(), password);
    } catch (err) {
      const status = getHttpStatus(err);
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length) {
        setFieldErrors(fe);
      } else if (status === 401) {
        setToastMsg('Incorrect email or password. Please check your credentials and try again.');
      } else if (status === 403) {
        setToastMsg('Your account has been suspended. Please contact support.');
      } else {
        setToastMsg(extractApiError(err) || 'Login failed. Please try again.');
      }
      setScreenState('idle');
    }

    if (result) {
      pendingSession.current = result;
      // Single state update: loading → success (one render, one modal transition)
      setScreenState('success');
      toastTimer.current = setTimeout(() => {
        if (pendingSession.current) {
          updateSession(pendingSession.current.token, pendingSession.current.user);
        }
      }, 4000);
    }
  };

  const handleSendOtp = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldError('email', emailError);
      emailRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setOtpLoading(true);
    try {
      const trimmed = email.trim().toLowerCase();
      const res = await authService.sendOtp({ email: trimmed });
      navigation.navigate('OTPVerification', {
        email: trimmed,
        maskedDestination: res.maskedDestination,
        resendAfterSec: res.resendAfterSec ?? 60,
        returnTo: route.params?.returnTo,
      });
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 404) {
        setFieldError('email', 'No account found with this email.');
      } else {
        setToastMsg(extractApiError(err) || 'Could not send OTP. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Toast
        visible={!!toastMsg}
        message={toastMsg ?? ''}
        type="error"
        onHide={() => setToastMsg(null)}
      />
      <AppHeader title="Login" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.sub}>Login to book your next game</Text>
        {/* DEBUG BANNER — remove after confirming LAN connectivity */}
        <Text style={styles.debugBanner}>API: {BASE_URL}</Text>

        <View style={{ marginTop: spacing.xl }}>
          <AppInput
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); setFieldError('email', validateEmail(v)); }}
            onBlur={() => setFieldError('email', validateEmail(email))}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            error={fieldErrors.email}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AppInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldError('password', validateLoginPassword(v)); }}
            onBlur={() => setFieldError('password', validateLoginPassword(password))}
            secureTextEntry
            error={fieldErrors.password}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ alignSelf: 'flex-end' }}
          >
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <AppButton
            label="Login"
            onPress={handleLogin}
            loading={screenState === 'loading'}
            disabled={!isFormValid || busy}
          />
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.or}>OR</Text>
            <View style={styles.line} />
          </View>
          <AppButton
            label="Continue with OTP"
            icon="📱"
            variant="secondary"
            loading={otpLoading}
            disabled={!isEmailValid || otpLoading || busy}
            onPress={handleSendOtp}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register', { returnTo: route.params?.returnTo })}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LoadingOverlay visible={screenState === 'loading'} />

      <Modal
        visible={screenState === 'success'}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.successOverlay} pointerEvents="none">
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Login Successful!</Text>
            <Text style={styles.successSub}>Taking you to your account…</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.md, color: colors.textMid, marginTop: spacing.xs },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: spacing.md, color: colors.textDim, fontSize: fontSize.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
  debugBanner: { marginTop: spacing.xs, fontSize: 10, color: '#888', fontFamily: 'monospace' },
  successOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  successCard: {
    backgroundColor: '#16A34A',
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
  successIcon: { fontSize: 44, color: '#fff' },
  successTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff', textAlign: 'center' },
  successSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
