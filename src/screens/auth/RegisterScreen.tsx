import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader, LoadingOverlay } from '../../components/common';
import { UserRole } from '../../types';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, extractFieldErrors, getHttpStatus } from '../../api/client';
import {
  validateEmail, validatePassword, validateName, validatePhone, collectErrors,
} from '../../utils/validation';

export default function RegisterScreen({ navigation, route }: any) {
  const { registerUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Sets or clears a single field's inline error.
  const setFieldError = (field: string, err: string | null) =>
    setFieldErrors((prev) => ({ ...prev, [field]: err ?? '' }));

  // True only when every field passes its validator — gates the submit button.
  const isFormValid =
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePhone(phone) &&
    !validatePassword(password);

  const handleRegister = async () => {
    const errors = collectErrors([
      ['name', () => validateName(name)],
      ['email', () => validateEmail(email)],
      ['phone', () => validatePhone(phone)],
      ['password', () => validatePassword(password)],
    ]);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setFormError(null);
      // Focus the first invalid field so the user sees it immediately.
      if (errors.name) nameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else if (errors.phone) phoneRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setLoading(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
      });
      // Success: RootNavigator watches isLoggedIn and navigates automatically.
    } catch (err) {
      const status = getHttpStatus(err);
      const fe = extractFieldErrors(err);

      if (Object.keys(fe).length) {
        // Server returned per-field validation errors (400).
        setFieldErrors(fe);
      } else if (status === 409) {
        // Email already registered — pin the error to the email field.
        setFieldErrors({ email: 'An account with this email already exists. Try logging in.' });
      } else if (status === 400) {
        // Generic bad request the server didn't break into fields.
        setFormError(extractApiError(err));
      } else {
        // Network error, 5xx, etc.
        Alert.alert('Registration Failed', extractApiError(err));
      }
    } finally {
      setLoading(false);
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
            onChangeText={(v) => {
              setName(v);
              setFieldError('name', validateName(v));
            }}
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
            onChangeText={(v) => {
              setEmail(v);
              setFieldError('email', validateEmail(v));
            }}
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
            onChangeText={(v) => {
              setPhone(v);
              setFieldError('phone', validatePhone(v));
            }}
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
            onChangeText={(v) => {
              setPassword(v);
              setFieldError('password', validatePassword(v));
            }}
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

        {formError ? (
          <View style={styles.formErrorBox}>
            <Text style={styles.formErrorText}>{formError}</Text>
          </View>
        ) : null}

        <AppButton
          label="Register"
          onPress={handleRegister}
          loading={loading}
          disabled={!isFormValid || loading}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { returnTo: route.params?.returnTo })}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <LoadingOverlay visible={loading} />
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
  formErrorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#FEE2E2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  formErrorText: { color: '#B91C1C', fontSize: fontSize.sm, lineHeight: 20 },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.textMid, fontSize: fontSize.sm },
  passwordRules: { marginTop: spacing.xs, gap: 2 },
  passwordRuleItem: { fontSize: fontSize.xs, color: colors.textMid },
});
