import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reset Password" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.heading}>Forgot your password?</Text>
        <Text style={styles.sub}>Enter your phone number and we'll send you a reset code.</Text>
        <View style={{ marginTop: spacing.xl }}>
          <AppInput label="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
          <AppButton label="Send Reset Code" onPress={() => navigation.navigate('OTPVerification', { phone })} />
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
