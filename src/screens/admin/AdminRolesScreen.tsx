import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AvatarImage } from '../../components/common';
import { QueryState } from '../../components/QueryState';
import { useAdmins, useSetAdminRole } from '../../api/hooks/useAdminRoles';
import { toast } from '../../toast';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type { AdminSummary, AdminRoleValue } from '../../api/types';

/**
 * Super-admin-only screen to manage admin sub-roles (RBAC). Lists every admin and lets a
 * super-admin promote/demote them between SUPER_ADMIN / SUPPORT / READ_ONLY. The endpoints
 * (GET /api/v1/admin/admins, PATCH /api/v1/admin/users/{id}/admin-role) are themselves gated
 * to super-admin server-side; this screen is only reachable when user.adminRole === 'SUPER_ADMIN'.
 */

const ROLE_META: Record<AdminRoleValue, { label: string; color: string; desc: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: colors.admin, desc: 'Full access — ban, delete & manage admin roles.' },
  SUPPORT: { label: 'Support', color: colors.info, desc: 'Moderate (suspend, verify, message) — but not ban or delete.' },
  READ_ONLY: { label: 'Read Only', color: colors.textMid, desc: 'View-only — cannot make any changes.' },
};

const ROLE_ORDER: AdminRoleValue[] = ['SUPER_ADMIN', 'SUPPORT', 'READ_ONLY'];

function RoleChip({ role }: { role: AdminRoleValue }) {
  const m = ROLE_META[role];
  return (
    <View style={[s.chip, { backgroundColor: m.color + '22' }]}>
      <Text style={[s.chipText, { color: m.color }]}>{m.label}</Text>
    </View>
  );
}

export default function AdminRolesScreen({ navigation }: any) {
  const adminsQuery = useAdmins();
  const setRole = useSetAdminRole();
  const [target, setTarget] = useState<AdminSummary | null>(null);

  const apply = (role: AdminRoleValue) => {
    if (!target || target.adminRole === role) { setTarget(null); return; }
    const t = target;
    setTarget(null);
    setRole.mutate(
      { id: t.id, adminRole: role },
      {
        onSuccess: () => toast.success(`${t.name} is now ${ROLE_META[role].label}.`),
        onError: () => toast.error('Could not update the admin role. Please try again.'),
      },
    );
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
              <Text style={s.intro}>
                Assign what each admin can do. Changes apply on their next sign-in.
              </Text>
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
                You can't change your own role — ask another super-admin to do that.
              </Text>
            }
          />
        )}
      </QueryState>

      {/* Role picker */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <Pressable style={s.backdrop} onPress={() => setTarget(null)} />
        <View style={[s.sheet, shadow.modal]}>
          <Text style={s.sheetTitle}>Set role for {target?.name}</Text>
          {ROLE_ORDER.map((role) => {
            const m = ROLE_META[role];
            const active = target?.adminRole === role;
            return (
              <TouchableOpacity key={role} style={[s.option, active && s.optionActive]} onPress={() => apply(role)}>
                <View style={[s.dot, { backgroundColor: m.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.optionLabel}>{m.label}</Text>
                  <Text style={s.optionDesc}>{m.desc}</Text>
                </View>
                {active && <Feather name="check" size={18} color={m.color} />}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.cancel} onPress={() => setTarget(null)}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  optionActive: { borderColor: colors.admin, backgroundColor: colors.primaryLight },
  dot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  optionDesc: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  cancelText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textMid },
});
