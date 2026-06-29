import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppButton, AppInput, LoadingOverlay } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { toast } from '../../toast';
import { useAuth } from '../../store/AuthContext';
import { authService } from '../../api/services/authService';
import { extractApiError, getHttpStatus } from '../../api/client';

const POLICY_HINT = 'Min 8 characters, at least 1 letter and 1 digit.';

function meetsPolicy(pwd: string): boolean {
  return pwd.length >= 8 && /[a-zA-Z]/.test(pwd) && /[0-9]/.test(pwd);
}

/**
 * Full-screen, non-dismissible gate shown when the server requires a password change before the
 * account can be used (e.g. a bootstrap-seeded super-admin on first login — see AdminSeeder +
 * JwtAuthenticationFilter). The only ways out are a successful change or signing out.
 */
export default function ForcedChangePasswordScreen() {
  const { user, logout, completeForcedPasswordChange } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLogout, setShowLogout] = useState(false);

  const policyOk = meetsPolicy(next);
  const confirmOk = next === confirm && confirm.length > 0;
  const canSubmit = current.trim().length > 0 && policyOk && confirmOk && !submitting;

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!current.trim()) errs.current = 'Current password is required';
    if (!meetsPolicy(next)) errs.next = POLICY_HINT;
    if (next !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await authService.changePassword({ currentPassword: current, newPassword: next });
      if (!res.token || !res.user) throw new Error('Invalid server response');
      await completeForcedPasswordChange(res.token, res.user);
      toast.success('Password updated. Welcome aboard!');
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 401) {
        setErrors({ current: 'Current password is incorrect.' });
      } else if (status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error(extractApiError(err) || 'Password change failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.iconWrap}>
            <Feather name="shield" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            For security, you must change your password before continuing
            {user?.email ? ` (${user.email})` : ''}.
          </Text>

          <AppInput
            label="Current Password"
            value={current}
            onChangeText={(v) => { setCurrent(v); if (errors.current) setErrors((e) => ({ ...e, current: '' })); }}
            secureTextEntry={!showCurrent}
            error={errors.current}
            rightElement={
              <TouchableOpacity onPress={() => setShowCurrent((s) => !s)}>
                <Text style={styles.toggleEye}>{showCurrent ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />

          <AppInput
            label="New Password"
            value={next}
            onChangeText={(v) => { setNext(v); if (errors.next) setErrors((e) => ({ ...e, next: '' })); }}
            secureTextEntry={!showNext}
            error={errors.next}
            rightElement={
              <TouchableOpacity onPress={() => setShowNext((s) => !s)}>
                <Text style={styles.toggleEye}>{showNext ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />
          {next.length > 0 && (
            <View style={styles.hints}>
              <Hint ok={next.length >= 8} label="At least 8 characters" />
              <Hint ok={/[a-zA-Z]/.test(next)} label="At least 1 letter" />
              <Hint ok={/[0-9]/.test(next)} label="At least 1 digit" />
            </View>
          )}

          <AppInput
            label="Confirm New Password"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); if (errors.confirm) setErrors((e) => ({ ...e, confirm: '' })); }}
            secureTextEntry={!showNext}
            error={errors.confirm}
          />

          <AppButton
            label="Update Password"
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={{ marginTop: spacing.lg }}
          />

          <TouchableOpacity style={styles.signOutRow} onPress={() => setShowLogout(true)} activeOpacity={0.7}>
            <Text style={styles.signOutLink}>Sign in with a different account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmActionModal
        visible={showLogout}
        title="Sign out?"
        message="You'll need to sign in again. Your password has not been changed."
        confirmLabel="Sign out"
        danger
        onConfirm={() => { setShowLogout(false); logout(); }}
        onDismiss={() => setShowLogout(false)}
      />
      <LoadingOverlay visible={submitting} />
    </SafeAreaView>
  );
}

function Hint({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={[styles.hint, ok ? styles.hintOk : styles.hintFail]}>
      {ok ? '✓' : '○'} {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  iconWrap: {
    width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, color: colors.textMid, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  toggleEye: { fontSize: 18, padding: spacing.xs },
  hints: { marginBottom: spacing.md, paddingLeft: spacing.xs },
  hint: { fontSize: fontSize.xs, marginBottom: 2 },
  hintOk: { color: colors.success },
  hintFail: { color: colors.textDim },
  signOutRow: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  signOutLink: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },
});
