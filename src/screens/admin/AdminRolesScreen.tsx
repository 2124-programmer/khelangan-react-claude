import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AvatarImage, AppButton, AppInput } from '../../components/common';
import { QueryState } from '../../components/QueryState';
import { ConfirmActionModal } from '../../modals';
import {
  useAdmins, useSetAdminRole, useCreateAdmin, usePromoteToAdmin, useRemoveAdmin,
} from '../../api/hooks/useAdminRoles';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type { AdminSummary, AdminRoleValue, RemoveAdminMode } from '../../api/types';

/**
 * Super-admin-only screen to manage admin accounts (RBAC + lifecycle). A super-admin can:
 *   • Create a brand-new admin account, or promote an existing user to admin   (Create)
 *   • See every admin and their effective sub-role                              (Read)
 *   • Change an admin's sub-role: SUPER_ADMIN / SUPPORT / READ_ONLY             (Update)
 *   • Revoke admin access (demote to player) or deactivate the account          (Delete)
 * All endpoints are gated to super-admin server-side; this screen is only reachable when
 * user.adminRole === 'SUPER_ADMIN'. You can never change or remove your own access here.
 */

const ROLE_META: Record<AdminRoleValue, { label: string; color: string; desc: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: colors.admin, desc: 'Full access — ban, delete & manage admin roles.' },
  SUPPORT: { label: 'Support', color: colors.info, desc: 'Moderate (suspend, verify, message) — but not ban or delete.' },
  READ_ONLY: { label: 'Read Only', color: colors.textMid, desc: 'View-only — cannot make any changes.' },
};

const ROLE_ORDER: AdminRoleValue[] = ['SUPER_ADMIN', 'SUPPORT', 'READ_ONLY'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RoleChip({ role }: { role: AdminRoleValue }) {
  const m = ROLE_META[role];
  return (
    <View style={[s.chip, { backgroundColor: m.color + '22' }]}>
      <Text style={[s.chipText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

/** Reusable role selector — the three roles as tappable option rows. */
function RoleSelect({ value, onChange }: { value: AdminRoleValue; onChange: (r: AdminRoleValue) => void }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.fieldLabel}>Role</Text>
      {ROLE_ORDER.map((role) => {
        const m = ROLE_META[role];
        const active = value === role;
        return (
          <TouchableOpacity key={role} style={[s.option, active && s.optionActive]} onPress={() => onChange(role)} activeOpacity={0.8}>
            <View style={[s.dot, { backgroundColor: m.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.optionLabel}>{m.label}</Text>
              <Text style={s.optionDesc}>{m.desc}</Text>
            </View>
            {active && <Feather name="check" size={18} color={m.color} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type AddMode = 'create' | 'promote';
type RemoveTarget = { admin: AdminSummary; mode: RemoveAdminMode } | null;

export default function AdminRolesScreen({ navigation }: any) {
  const adminsQuery = useAdmins();
  const setRole = useSetAdminRole();
  const createAdmin = useCreateAdmin();
  const promoteAdmin = usePromoteToAdmin();
  const removeAdmin = useRemoveAdmin();

  // Manage sheet (role change + remove) for an existing admin.
  const [target, setTarget] = useState<AdminSummary | null>(null);
  // Destructive confirm (revoke / deactivate).
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget>(null);

  // Add-admin sheet.
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRoleValue>('SUPPORT');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const addPending = createAdmin.isPending || promoteAdmin.isPending;

  /* ── Update: change an existing admin's sub-role ── */
  const apply = (role: AdminRoleValue) => {
    if (!target || target.adminRole === role) { setTarget(null); return; }
    const t = target;
    setTarget(null);
    setRole.mutate(
      { id: t.id, adminRole: role },
      {
        onSuccess: () => toast.success(`${t.name} is now ${ROLE_META[role].label}.`),
        onError: (err) => toast.error(extractApiError(err)),
      },
    );
  };

  /* ── Delete: revoke (demote) or deactivate ── */
  const confirmRemove = () => {
    if (!removeTarget) return;
    const { admin, mode } = removeTarget;
    setRemoveTarget(null);
    removeAdmin.mutate(
      { id: admin.id, mode },
      {
        onSuccess: () => toast.success(
          mode === 'deactivate'
            ? `${admin.name}'s account was deactivated.`
            : `Admin access revoked for ${admin.name}.`,
        ),
        onError: (err) => toast.error(extractApiError(err)),
      },
    );
  };

  /* ── Create / Promote ── */
  const openAdd = () => {
    setAddMode('create');
    setName(''); setEmail(''); setPassword(''); setNewRole('SUPPORT');
    setErrors({});
    setShowAdd(true);
  };
  const closeAdd = () => { if (!addPending) setShowAdd(false); };

  const switchMode = (mode: AddMode) => {
    setAddMode(mode);
    setErrors({});
  };

  const validateAdd = () => {
    const next: { name?: string; email?: string; password?: string } = {};
    const e = email.trim();
    if (!e) next.email = 'Email is required.';
    else if (!EMAIL_RE.test(e)) next.email = 'Enter a valid email address.';
    if (addMode === 'create') {
      if (!name.trim()) next.name = 'Name is required.';
      else if (name.trim().length < 2) next.name = 'Name must be at least 2 characters.';
      if (!password) next.password = 'Password is required.';
      else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
      else if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        next.password = 'Use at least one letter and one digit.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitAdd = async () => {
    if (!validateAdd()) return;
    try {
      if (addMode === 'create') {
        const created = await createAdmin.mutateAsync({
          name: name.trim(), email: email.trim().toLowerCase(), password, adminRole: newRole,
        });
        toast.success(`${created.name} added as ${ROLE_META[created.adminRole].label}.`);
      } else {
        const promoted = await promoteAdmin.mutateAsync({
          email: email.trim().toLowerCase(), adminRole: newRole,
        });
        toast.success(`${promoted.name} is now ${ROLE_META[promoted.adminRole].label}.`);
      }
      setShowAdd(false);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="Admin Roles" onBack={() => navigation.goBack()} />

      <QueryState
        query={adminsQuery}
        center
        isEmpty={(list) => list.length === 0}
        empty={{ icon: '🛡️', title: 'No admins found' }}
      >
        {(admins) => (
          <FlatList
            data={admins}
            keyExtractor={(a) => String(a.id)}
            contentContainerStyle={{ padding: spacing.lg }}
            ListHeaderComponent={
              <View>
                <Text style={s.intro}>
                  Assign what each admin can do, add new admins, or revoke access. Changes apply on their next sign-in.
                </Text>
                <AppButton label="+ Add admin" onPress={openAdd} style={{ marginBottom: spacing.lg }} />
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.row, shadow.card]}
                activeOpacity={item.self ? 1 : 0.7}
                disabled={item.self}
                onPress={() => setTarget(item)}
              >
                <AvatarImage name={item.name} uri={item.avatarUrl ?? undefined} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>
                    {item.name}{item.self ? '  (You)' : ''}
                  </Text>
                  <Text style={s.email} numberOfLines={1}>{item.email}</Text>
                </View>
                <RoleChip role={item.adminRole} />
                {!item.self && <Feather name="chevron-right" size={20} color={colors.textDim} />}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <Text style={s.note}>
                You can't change or remove your own access — ask another super-admin to do that.
              </Text>
            }
          />
        )}
      </QueryState>

      {/* Manage sheet — role change + remove */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <Pressable style={s.backdrop} onPress={() => setTarget(null)} />
        <View style={[s.sheet, shadow.modal]}>
          <Text style={s.sheetTitle}>Manage {target?.name}</Text>
          <Text style={s.fieldLabel}>Role</Text>
          {ROLE_ORDER.map((role) => {
            const m = ROLE_META[role];
            const active = target?.adminRole === role;
            return (
              <TouchableOpacity key={role} style={[s.option, active && s.optionActive]} onPress={() => apply(role)} activeOpacity={0.8}>
                <View style={[s.dot, { backgroundColor: m.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optionLabel}>{m.label}</Text>
                  <Text style={s.optionDesc}>{m.desc}</Text>
                </View>
                {active && <Feather name="check" size={18} color={m.color} />}
              </TouchableOpacity>
            );
          })}

          <View style={s.divider} />
          <Text style={s.dangerHeading}>Remove admin</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <AppButton
              label="Revoke access"
              variant="secondary"
              onPress={() => { const a = target; setTarget(null); if (a) setRemoveTarget({ admin: a, mode: 'demote' }); }}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Deactivate"
              variant="danger"
              onPress={() => { const a = target; setTarget(null); if (a) setRemoveTarget({ admin: a, mode: 'deactivate' }); }}
              style={{ flex: 1 }}
            />
          </View>

          <TouchableOpacity style={s.cancel} onPress={() => setTarget(null)}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Add admin sheet */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={closeAdd}>
        <Pressable style={s.backdrop} onPress={closeAdd} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.addWrap}
          pointerEvents="box-none"
        >
          <View style={[s.addSheet, shadow.modal]}>
            <Text style={s.sheetTitle}>Add an admin</Text>

            {/* Segmented: create new vs promote existing */}
            <View style={s.segment}>
              {(['create', 'promote'] as AddMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[s.segmentBtn, addMode === mode && s.segmentBtnActive]}
                  onPress={() => switchMode(mode)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.segmentText, addMode === mode && s.segmentTextActive]}>
                    {mode === 'create' ? 'Create new' : 'Promote existing'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              {addMode === 'create' && (
                <AppInput
                  label="Full name"
                  value={name}
                  onChangeText={(t) => { setName(t); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
                  placeholder="e.g. Priya Sharma"
                  error={errors.name}
                  autoCapitalize="words"
                  maxLength={100}
                />
              )}
              <AppInput
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: undefined })); }}
                placeholder="admin@example.com"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                textContentType="emailAddress"
                autoComplete="email"
                maxLength={255}
              />
              {addMode === 'create' && (
                <AppInput
                  label="Temporary password"
                  value={password}
                  onChangeText={(t) => { setPassword(t); if (errors.password) setErrors((e) => ({ ...e, password: undefined })); }}
                  placeholder="Min 8 chars, a letter & a digit"
                  error={errors.password}
                  secureTextEntry
                  textContentType="newPassword"
                  maxLength={100}
                />
              )}
              <RoleSelect value={newRole} onChange={setNewRole} />
              {addMode === 'promote' && (
                <Text style={s.hint}>
                  The user must already have an account. They'll gain admin access on their next sign-in.
                </Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <AppButton label="Cancel" variant="secondary" onPress={closeAdd} disabled={addPending} style={{ flex: 1 }} />
              <AppButton
                label={addMode === 'create' ? 'Create admin' : 'Promote'}
                onPress={submitAdd}
                loading={addPending}
                disabled={addPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Destructive confirm */}
      <ConfirmActionModal
        visible={!!removeTarget}
        title={removeTarget?.mode === 'deactivate' ? 'Deactivate account?' : 'Revoke admin access?'}
        message={
          removeTarget?.mode === 'deactivate'
            ? `${removeTarget?.admin.name} will be signed out and can no longer log in. This is a hard removal.`
            : `${removeTarget?.admin.name} will lose admin access and become a regular user. They can still log in.`
        }
        confirmLabel={removeTarget?.mode === 'deactivate' ? 'Deactivate' : 'Revoke'}
        danger
        onConfirm={confirmRemove}
        onDismiss={() => setRemoveTarget(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: fontSize.sm, color: colors.textMid, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md,
  },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  email: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  chipText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  note: { fontSize: fontSize.xs, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.admin, backgroundColor: colors.primaryLight },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  optionDesc: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  dangerHeading: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.danger, marginBottom: spacing.sm },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  cancelText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textMid },
  // Add sheet
  addWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  addSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xl,
  },
  segment: {
    flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: 3, marginBottom: spacing.md,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface, ...shadow.card },
  segmentText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  segmentTextActive: { color: colors.text },
  hint: { fontSize: fontSize.xs, color: colors.textDim, marginBottom: spacing.sm },
});
