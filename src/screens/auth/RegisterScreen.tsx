import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppInput, AppButton, AppHeader } from '../../components/common';
import { toast } from '../../toast';
import { UserRole } from '../../types';
import type { UserDto } from '../../api/types';
import { useAuth } from '../../store/AuthContext';
import { peekPendingNav } from '../../store/pendingNav';
import { extractApiError, extractFieldErrors, getHttpStatus } from '../../api/client';
import {
  validateEmail, validatePassword, validateName, validatePhone, collectErrors,
} from '../../utils/validation';

// Single source of truth for the password floor (shared with reset + backend policy).
const PASSWORD_MIN = 8;

type ScreenState = 'idle' | 'loading';

export default function RegisterScreen({ navigation, route }: any) {
  const { registerUserDeferred, updateSession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [screenState, setScreenState] = useState<ScreenState>('idle');

  // Live password checklist — each rule ticks green as it's satisfied.
  const pwRules = {
    length: password.length >= PASSWORD_MIN,
    letter: /[a-zA-Z]/.test(password),
    number: /[0-9]/.test(password),
  };

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const setFieldError = (field: string, err: string | null) =>
    setFieldErrors((prev) => ({ ...prev, [field]: err ?? '' }));

  const isFormValid =
    !validateName(name) &&
    !validateEmail(email) &&
    !validatePhone(phone) &&
    !validatePassword(password, PASSWORD_MIN) &&
    acceptedTerms;

  const busy = screenState !== 'idle';

  const handleRegister = async () => {
    const errors = collectErrors([
      ['name', () => validateName(name)],
      ['email', () => validateEmail(email)],
      ['phone', () => validatePhone(phone)],
      ['password', () => validatePassword(password, PASSWORD_MIN)],
    ]);
    if (!acceptedTerms) {
      toast.error('Please accept the Terms & Privacy Policy to continue.');
      return;
    }
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
        acceptedTerms,
      });
    } catch (err) {
      // Clear loading first so the Register button's spinner stops before we surface the error.
      setScreenState('idle');
      const status = getHttpStatus(err);
      const fe = extractFieldErrors(err);
      if (Object.keys(fe).length) {
        setFieldErrors(fe);
      } else if (status === 409) {
        // Duplicate email/phone — highlight the right field inline AND show a toast (which stays
        // ~4.5s) so the reason is unmissable, not just a small field hint.
        const msg = extractApiError(err) || '';
        const isPhone = /phone/i.test(msg);
        const friendly = isPhone
          ? 'This phone number is already registered. Try logging in.'
          : 'An account with this email already exists. Try logging in.';
        setFieldErrors({ [isPhone ? 'phone' : 'email']: friendly });
        (isPhone ? phoneRef : emailRef).current?.focus();
        toast.error(friendly);
      } else {
        toast.error(extractApiError(err) || 'Registration failed. Please try again.');
      }
    }

    if (result) {
      // Skip the generic welcome toast when a deferred destination will show its own.
      if (!peekPendingNav()) {
        const firstName = result.user.name?.split(' ')[0] ?? '';
        toast.success(firstName ? `Welcome, ${firstName}! Your account is ready.` : 'Account created successfully!');
      }
      await updateSession(result.token, result.user);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Create Account" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            textContentType="name"
            autoComplete="name"
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
            textContentType="emailAddress"
            autoComplete="email"
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
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="9876543210"
            error={fieldErrors.phone}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <AppInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setFieldError('password', validatePassword(v, PASSWORD_MIN)); }}
            onBlur={() => setFieldError('password', validatePassword(password, PASSWORD_MIN))}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="password-new"
            placeholder="Min 8 characters"
            error={fieldErrors.password}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
          />
          <View style={styles.passwordRules}>
            <PwRule ok={pwRules.length} label={`At least ${PASSWORD_MIN} characters`} />
            <PwRule ok={pwRules.letter} label="At least one letter (a–z or A–Z)" />
            <PwRule ok={pwRules.number} label="At least one number (0–9)" />
          </View>
        </View>

        {/* Terms & Privacy consent (DPDP) — required before account creation. */}
        <TouchableOpacity
          style={styles.consentRow}
          onPress={() => setAcceptedTerms((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
            {acceptedTerms ? <Text style={styles.checkboxTick}>✓</Text> : null}
          </View>
          <Text style={styles.consentText}>
            I agree to the <Text style={styles.link}>Terms & Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <AppButton
          label="Register"
          onPress={handleRegister}
          loading={screenState === 'loading'}
          disabled={!isFormValid || busy}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            disabled={busy}
            onPress={() => navigation.navigate('Login', { returnTo: route.params?.returnTo })}
          >
            <Text style={[styles.link, busy && { opacity: 0.5 }]}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={[styles.passwordRuleItem, ok ? styles.passwordRuleOk : styles.passwordRuleFail]}>
      {ok ? '✓' : '○'} {label}
    </Text>
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
  passwordRuleOk: { color: colors.success },
  passwordRuleFail: { color: colors.textMid },
  consentRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.white, fontSize: 14, fontWeight: fontWeight.bold },
  consentText: { flex: 1, fontSize: fontSize.sm, color: colors.textMid },
  successTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff', textAlign: 'center' },
  successSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
