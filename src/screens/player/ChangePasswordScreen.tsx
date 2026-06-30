import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, LoadingOverlay } from '../../components/common';
import { centeredContent } from '../../responsive';
import { toast } from '../../toast';
import { useAuth } from '../../store/AuthContext';
import { extractApiError, getHttpStatus } from '../../api/client';
import { useChangePassword } from '../../api/hooks/usePasswordReset';

const POLICY_HINT = 'Min 8 characters, at least 1 letter and 1 digit.';

function meetsPolicy(pwd: string): boolean {
  return pwd.length >= 8 &&
    /[a-zA-Z]/.test(pwd) &&
    /[0-9]/.test(pwd);
}

export default function ChangePasswordScreen({ navigation }: any) {
  const { updateSession } = useAuth();
  const changePassword = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const policyOk = meetsPolicy(next);
  const confirmOk = next === confirm && confirm.length > 0;
  const canSubmit = current.trim().length > 0 && policyOk && confirmOk && !changePassword.isPending;

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!current.trim()) errs.current = 'Current password is required';
    if (!meetsPolicy(next)) errs.next = POLICY_HINT;
    if (next !== confirm) errs.confirm = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      const res = await changePassword.mutateAsync({ currentPassword: current, newPassword: next });
      if (res.token && res.user) {
        await updateSession(res.token, res.user);
      }
      toast.success('Password updated. You are still signed in.');
      navigation.goBack();
    } catch (err) {
      const status = getHttpStatus(err);
      if (status === 401) {
        setErrors({ current: 'Current password is incorrect.' });
      } else if (status === 429) {
        toast.error('Too many attempts. Please try again later.');
      } else {
        toast.error(extractApiError(err) || 'Password change failed. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Change Password" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}>

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

        {/* Escape hatch for users who don't remember their current password → email-OTP reset. */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => navigation.navigate('ForgotPassword', { fromSecurity: true })}
          activeOpacity={0.7}
        >
          <Text style={styles.forgotLink}>Forgot password?</Text>
        </TouchableOpacity>

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
          secureTextEntry={!showConfirm}
          error={errors.confirm}
          rightElement={
            <TouchableOpacity onPress={() => setShowConfirm((s) => !s)}>
              <Text style={styles.toggleEye}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          }
        />

        <AppButton
          label="Update Password"
          loading={changePassword.isPending}
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
      <LoadingOverlay visible={changePassword.isPending} />
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
  toggleEye: { fontSize: 18, padding: spacing.xs },
  forgotRow: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.lg, padding: spacing.xs },
  forgotLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  hints: { marginBottom: spacing.md, paddingLeft: spacing.xs },
  hint: { fontSize: fontSize.xs, marginBottom: 2 },
  hintOk: { color: colors.success },
  hintFail: { color: colors.textDim },
});
