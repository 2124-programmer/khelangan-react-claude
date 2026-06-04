import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors, getHttpStatus } from '../../api/client';
import { authService } from '../../api/services/authService';
import {
  validateEmail, validateLoginPassword, collectErrors,
} from '../../utils/validation';

export default function LoginScreen({ navigation }: any) {
  const { loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const clearAllErrors = () => {
    setFieldErrors({});
    setFormError(null);
  };

  const handleLogin = async () => {
    const errors = collectErrors([
      ['email', () => validateEmail(email)],
      ['password', () => validateLoginPassword(password)],
    ]);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }
    clearAllErrors();
    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password);
      // Success: RootNavigator watches isLoggedIn and navigates automatically.
    } catch (err) {
      const status = getHttpStatus(err);
      const fe = extractFieldErrors(err);

      if (Object.keys(fe).length) {
        // Server returned per-field validation errors (400).
        setFieldErrors(fe);
      } else if (status === 401) {
        // Wrong email or password — show inline, not a popup.
        setFormError('Incorrect email or password. Please check your credentials and try again.');
      } else if (status === 403) {
        setFormError('Your account has been suspended. Please contact support.');
      } else {
        // Network error, 5xx, etc. — Alert is appropriate here.
        Alert.alert('Login Failed', extractApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }
    clearAllErrors();
    setOtpLoading(true);
    try {
      const trimmed = email.trim().toLowerCase();
      const res = await authService.sendOtp({ email: trimmed });
      navigation.navigate('OTPVerification', {
        email: trimmed,
        maskedDestination: res.maskedDestination,
        resendAfterSec: res.resendAfterSec ?? 60,
      });
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 404) {
        setFieldErrors((prev) => ({ ...prev, email: 'No account found with this email.' }));
      } else {
        Alert.alert('Could not send OTP', extractApiError(err));
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Login" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.sub}>Login to book your next game</Text>

        <View style={{ marginTop: spacing.xl }}>
          <AppInput
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); clearFieldError('email'); setFormError(null); }}
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
            onChangeText={(v) => { setPassword(v); clearFieldError('password'); setFormError(null); }}
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

        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.lg }}>
          <AppButton
            label="Login"
            onPress={handleLogin}
            loading={loading}
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
            onPress={handleSendOtp}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.md, color: colors.textMid, marginTop: spacing.xs },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  formErrorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  formErrorText: { color: '#B91C1C', fontSize: fontSize.sm, lineHeight: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: spacing.md, color: colors.textDim, fontSize: fontSize.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
});
