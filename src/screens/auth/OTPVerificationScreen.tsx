import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppButton, AppHeader } from '../../components/common';
import { useAuth } from '../../store/AuthContext';

export default function OTPVerificationScreen({ navigation, route }: any) {
  const { login } = useAuth();
  const phone = route?.params?.phone ?? '+91 98765 43210';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleChange = (text: string, i: number) => {
    const next = [...otp];
    next[i] = text.slice(-1);
    setOtp(next);
    if (text && i < 5) inputs.current[i + 1]?.focus();
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Verify OTP" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.heading}>Enter verification code</Text>
        <Text style={styles.sub}>We sent a 6-digit code to {phone}</Text>

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
          label="Verify & Continue"
          onPress={() => login('player')}
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
    backgroundColor: colors.surface, textAlign: 'center', fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text,
  },
  resend: { textAlign: 'center', color: colors.textDim, marginTop: spacing.xl, fontSize: fontSize.sm },
});
