import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { UserRole } from '../../types';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors } from '../../api/client';

export default function RegisterScreen({ navigation }: any) {
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setFieldErrors({});
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) errors.name = 'Name must be at least 2 characters';
    if (!email.trim()) errors.email = 'Email is required';
    if (!phone.trim() || phone.trim().length < 7) errors.phone = 'Enter a valid phone number';
    if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    setLoading(true);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role });
      // RootNavigator picks up isLoggedIn change automatically
    } catch (err) {
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length) {
        setFieldErrors(fe);
      } else {
        Alert.alert('Registration Failed', extractApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

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
          <AppInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            error={fieldErrors.name}
          />
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
            error={fieldErrors.email}
          />
          <AppInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            error={fieldErrors.phone}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password (min 6 chars)"
            error={fieldErrors.password}
          />
        </View>

        <AppButton
          label={loading ? 'Creating Account…' : 'Register'}
          onPress={handleRegister}
          loading={loading}
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
