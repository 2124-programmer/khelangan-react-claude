import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { authService } from '../../api/services/authService';
import { extractApiError } from '../../api/client';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword({ email: email.trim().toLowerCase() });
      setSent(true);
      Alert.alert('Email Sent', res.message ?? 'Check your inbox for the reset link.');
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reset Password" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.heading}>Forgot your password?</Text>
        <Text style={styles.sub}>
          Enter your email address and we'll send you a reset link.
        </Text>
        <View style={{ marginTop: spacing.xl }}>
          <AppInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <AppButton
            label={loading ? 'Sending…' : sent ? 'Resend Link' : 'Send Reset Link'}
            onPress={handleSend}
            loading={loading}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  heading: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs, lineHeight: 20 },
});
