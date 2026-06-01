import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors } from '../../api/client';
import { authService } from '../../api/services/authService';

export default function LoginScreen({ navigation }: any) {
  const { loginWithCredentials, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const handleLogin = async () => {
    setFieldErrors({});
    if (!email.trim()) {
      setFieldErrors({ email: 'Email is required' });
      return;
    }
    if (!password) {
      setFieldErrors({ password: 'Password is required' });
      return;
    }
    setLoading(true);
    try {
      await loginWithCredentials(email.trim(), password);
      // Navigation handled automatically by RootNavigator on isLoggedIn change
    } catch (err) {
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length) {
        setFieldErrors(fe);
      } else {
        Alert.alert('Login Failed', extractApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Login" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heading}>Welcome back 👋</Text>
        <Text style={styles.sub}>Login to book your next game</Text>

        <View style={{ marginTop: spacing.xl }}>
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
            error={fieldErrors.email}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={fieldErrors.password}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={{ alignSelf: 'flex-end' }}
          >
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <AppButton
            label={loading ? 'Logging in…' : 'Login'}
            onPress={handleLogin}
            loading={loading}
          />
          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.or}>OR</Text>
            <View style={styles.line} />
          </View>
          <AppButton
            label={otpLoading ? 'Sending OTP…' : 'Continue with OTP'}
            icon="📱"
            variant="secondary"
            loading={otpLoading}
            onPress={async () => {
              const trimmed = email.trim();
              if (!trimmed) {
                setFieldErrors((prev) => ({ ...prev, email: 'Enter your email to receive an OTP' }));
                return;
              }
              setFieldErrors({});
              setOtpLoading(true);
              try {
                const res = await authService.sendOtp({ email: trimmed.toLowerCase() });
                navigation.navigate('OTPVerification', {
                  email: trimmed.toLowerCase(),
                  maskedDestination: res.maskedDestination,
                  resendAfterSec: res.resendAfterSec ?? 60,
                });
              } catch (err) {
                Alert.alert('Could not send OTP', extractApiError(err));
              } finally {
                setOtpLoading(false);
              }
            }}
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
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { marginHorizontal: spacing.md, color: colors.textDim, fontSize: fontSize.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
});
