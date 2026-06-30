import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AvatarImage } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { AppearanceSelector } from '../../components/AppearanceSelector';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { toast } from '../../toast';

/**
 * Admin Profile hub — reached from the dashboard header avatar. Personal account actions
 * (edit profile / change email / change password) reuse the existing /api/v1/users + /auth
 * endpoints and screens; Platform Settings links to the existing fees/commission screen.
 */
/** Human label for the effective admin sub-role; legacy NULL ⇒ Super Admin (mirrors the backend). */
const ADMIN_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  SUPPORT: 'Support',
  READ_ONLY: 'Read Only',
};

export default function AdminProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  const roleLabel = ADMIN_ROLE_LABEL[user?.adminRole ?? 'SUPER_ADMIN'] ?? 'Administrator';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Identity */}
        <View style={[styles.identityCard, shadow.card]}>
          <AvatarImage name={user?.name ?? 'Admin'} uri={user?.avatar ?? undefined} size={64} />
          <Text style={styles.name} numberOfLines={1}>{user?.name ?? 'Admin'}</Text>
          {user?.email ? <Text style={styles.email} numberOfLines={1}>{user.email}</Text> : null}
          <View style={styles.roleChip}><Text style={styles.roleChipText}>{roleLabel}</Text></View>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={[styles.group, shadow.card]}>
          <Row icon="user" label="Edit Profile" hint="Name, phone & photo"
            onPress={() => navigation.navigate('AdminEditProfile')} />
          <Divider />
          <Row icon="mail" label="Change Email" hint="Requires verification"
            onPress={() => navigation.navigate('EmailChange')} />
          <Divider />
          <Row icon="lock" label="Change Password" hint="You'll stay signed in"
            onPress={() => navigation.navigate('AdminChangePassword')} />
        </View>

        {/* Security — admin-role management is super-admin only */}
        {user?.adminRole === 'SUPER_ADMIN' && (
          <>
            <Text style={styles.sectionLabel}>Security</Text>
            <View style={[styles.group, shadow.card]}>
              <Row icon="shield" label="Admin Roles" hint="Set Support / Read-only access"
                onPress={() => navigation.navigate('AdminRoles')} />
              <Divider />
              <Row icon="server" label="App Configuration" hint="Base URL, database & runtime info"
                onPress={() => navigation.navigate('AppConfig')} />
            </View>
          </>
        )}

        {/* Platform — fees/commission/toggles are super-admin only */}
        {user?.adminRole === 'SUPER_ADMIN' && (
          <>
            <Text style={styles.sectionLabel}>Platform</Text>
            <View style={[styles.group, shadow.card]}>
              <Row icon="settings" label="Platform Settings" hint="Commission, fees & toggles"
                onPress={() => navigation.navigate('AdminSettings')} />
              <Divider />
              <Row icon="repeat" label="Court Change Requests" hint="Approve owner live-court changes"
                onPress={() => navigation.navigate('CourtChangeRequests')} />
            </View>
          </>
        )}

        {/* Appearance — light / dark / system */}
        <AppearanceSelector />

        {/* Logout */}
        <TouchableOpacity style={[styles.logoutBtn, shadow.card]} onPress={() => setShowLogout(true)}
          accessibilityRole="button" accessibilityLabel="Logout">
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmActionModal
        visible={showLogout}
        title="Logout?"
        message="You'll be signed out of the Admin panel."
        confirmLabel="Logout"
        danger
        onConfirm={() => { setShowLogout(false); toast.info('Signed out successfully.'); logout(); }}
        onDismiss={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
}

function Row({ icon, label, hint, onPress }: { icon: any; label: string; hint?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.rowIcon}><Feather name={icon} size={18} color={colors.admin} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Feather name="chevron-right" size={20} color={colors.textDim} />
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  identityCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  email: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  roleChip: { backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3, marginTop: spacing.md },
  roleChipText: { fontSize: fontSize.xs, color: colors.admin, fontWeight: fontWeight.bold },
  sectionLabel: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold, textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  rowHint: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 36 + spacing.md },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg },
  logoutText: { fontSize: fontSize.md, color: colors.danger, fontWeight: fontWeight.bold },
});
