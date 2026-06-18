import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader, LoadingOverlay, Toast } from '../../components/common';
import { UserRole } from '../../types';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors, getHttpStatus } from '../../api/client';
import {
  validateEmail, validatePassword, validateName, validatePhone, collectErrors,
} from '../../utils/validation';

type ScreenState = 'idle' | 'loading' | 'success';

export default function RegisterScreen({ navigation, route }: any) {
  const { registerUserDeferred, updateSession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorToast, setErrorToast] = useState({ visible: false, message: '' });
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const pendingSession = useRef<{ token: string; user: UserDto } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  const setFieldError = (field: string, err: string | null) =>
    setFieldErrors((prev) => ({ ...prev, [field]: err ?? '' }));

  const isFormValid =
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePhone(phone) &&
    !validatePassword(password);

  const busy = screenState !== 'idle';

  const handleRegister = async () => {
    const errors = collectErrors([
      ['name', () => validateName(name)],
      ['email', () => validateEmail(email)],
      ['phone', () => validatePhone(phone)],
      ['password', () => validatePassword(password)],
    ]);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else if (errors.phone) phoneRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setScreenState('loading');

    let result: { token: string; user: UserDto } | null = null;
    try {
      result = await registerUserDeferred({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
      });
    } catch (err) {
      const status = getHttpStatus(err);
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length) {
        setFieldErrors(fe);
      } else if (status === 409) {
        setFieldErrors({ email: 'An account with this email already exists. Try logging in.' });
      } else {
        setErrorToast({ visible: true, message: extractApiError(err) || 'Registration failed. Please try again.' });
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

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Create Account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>I am a</Text>
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
            ref={nameRef}
            label="Full Name"
            value={name}
            onChangeText={(v) => { setName(v); setFieldError('name', validateName(v)); }}
            onBlur={() => setFieldError('name', validateName(name))}
            placeholder="Your name"
            autoCapitalize="words"
            error={fieldErrors.name}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
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
            onSubmitEditing={() => phoneRef.current?.focus()}
          />
          <AppInput
            ref={phoneRef}
            label="Phone"
            value={phone}
            onChangeText={(v) => { setPhone(v); setFieldError('phone', validatePhone(v)); }}
            onBlur={() => setFieldError('phone', validatePhone(phone))}
            keyboardType="phone-pad"
            placeholder="9876543210"
            error={fieldErrors.phone}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AppInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldError('password', validatePassword(v)); }}
            onBlur={() => setFieldError('password', validatePassword(password))}
            secureTextEntry
            placeholder="Min 6 characters"
            error={fieldErrors.password}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <View style={styles.passwordRules}>
            <Text style={styles.passwordRuleItem}>• At least 6 characters</Text>
            <Text style={styles.passwordRuleItem}>• At least one letter (a–z or A–Z)</Text>
            <Text style={styles.passwordRuleItem}>• At least one number (0–9)</Text>
          </View>
        </View>

        <AppButton
          label="Register"
          onPress={handleRegister}
          loading={screenState === 'loading'}
          disabled={!isFormValid || busy}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { returnTo: route.params?.returnTo })}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <LoadingOverlay visible={screenState === 'loading'} />

      <Toast
        visible={errorToast.visible}
        message={errorToast.message}
        type="error"
        onHide={() => setErrorToast({ visible: false, message: '' })}
      />

      <Modal
        visible={screenState === 'success'}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.successOverlay} pointerEvents="none">
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Registration Successful!</Text>
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
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.md },
  roleBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, gap: 6 },
  roleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
  passwordRules: { marginTop: spacing.xs, gap: 2 },
  passwordRuleItem: { fontSize: fontSize.xs, color: colors.textMid },
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
