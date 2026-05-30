import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { useAuth } from '../../store/AuthContext';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState('rohan@example.com');
  const [password, setPassword] = useState('demo1234');

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Login" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.heading}>Welcome back 👋</Text>
        <Text style={styles.sub}>Login to book your next game</Text>

        <View style={{ marginTop: spacing.xl }}>
          <AppInput label="Email or Phone" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end' }}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <AppButton label="Login" onPress={() => login('player')} />
          <View style={styles.dividerRow}>
            <View style={styles.line} /><Text style={styles.or}>OR</Text><View style={styles.line} />
          </View>
          <AppButton label="Continue with Google" icon="🔵" variant="secondary" onPress={() => login('player')} />
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
