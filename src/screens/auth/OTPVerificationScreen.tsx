import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Alert } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppButton, AppHeader } from '../../components/common';
import { authService } from '../../api/services/authService';
import { saveToken, saveRefreshToken } from '../../api/tokenStorage';
import { adaptUser } from '../../api/adapters';
import { useAuth } from '../../store/AuthContext';
import { extractApiError } from '../../api/client';

export default function OTPVerificationScreen({ navigation, route }: any) {
  const phone: string = route?.params?.phone ?? '';
  const { login: loginAsDemo } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, i: number) => {
    const next = [...otp];
    next[i] = text.slice(-1);
    setOtp(next);
    if (text && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the full 6-digit code.');
      return;
    }
    if (!phone) {
      Alert.alert('Error', 'Phone number is missing. Please go back and try again.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.verifyOtp({ phone, code });
      if (res.token && res.user) {
        await saveToken(res.token);
        await saveRefreshToken(res.refreshToken ?? res.token);
        // AuthContext doesn't expose a direct token-setter; navigate and let the
        // startup useEffect restore the session from SecureStore on next mount.
        // For an immediate UX win, use demo login with the returned user's role.
        const user = adaptUser(res.user);
        loginAsDemo(user.role);
      }
    } catch (err) {
      Alert.alert('Verification Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Verify OTP" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.heading}>Enter verification code</Text>
        <Text style={styles.sub}>
          We sent a 6-digit code to {phone || 'your phone'}
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              style={styles.otpBox}
              value={digit}
              onChangeText={(t) => handleChange(t, i)}
              keyboardType="numeric"
              maxLength={1}
            />
          ))}
        </View>

        <Text style={styles.resend}>Resend code in 0:59</Text>

        <AppButton
          label={loading ? 'Verifying…' : 'Verify & Continue'}
          onPress={handleVerify}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xxl },
  otpBox: {
    width: 48, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, textAlign: 'center', fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  resend: { textAlign: 'center', color: colors.textDim, marginTop: spacing.xl, fontSize: fontSize.sm },
});
