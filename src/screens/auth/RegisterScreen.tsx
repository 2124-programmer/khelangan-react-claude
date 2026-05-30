import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { UserRole } from '../../types';

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Create Account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>I am a</Text>
        <View style={styles.roleRow}>
          {(['player', 'owner'] as UserRole[]).map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
            >
              <Text style={{ fontSize: 22 }}>{r === 'player' ? '👤' : '🏟'}</Text>
              <Text style={[styles.roleText, role === r && { color: colors.white }]}>
                {r === 'player' ? 'Player' : 'Venue Owner'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <AppInput label="Full Name" value={name} onChangeText={setName} placeholder="Your name" />
          <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
          <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
          <AppInput label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Create a password" />
        </View>

        <AppButton
          label="Register"
          onPress={() => navigation.navigate('OTPVerification', { phone })}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, gap: 6 },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
});
