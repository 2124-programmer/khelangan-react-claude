import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AvatarImage } from '../../components/common';
import { centeredContent } from '../../responsive';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { useMe } from '../../api/hooks/useUser';
import { toast } from '../../toast';

const ACCOUNT_MENU = [
  { icon: '✏️', label: 'Edit Profile', route: 'EditProfile' },
  { icon: '🔒', label: 'Security', route: 'Security' },
];

const PREFS_MENU = [
  { icon: '🔔', label: 'Notifications', route: 'Notifications' },
  { icon: '🎟️', label: 'Offers & Coupons', route: 'Offers' },
  { icon: '⚙️', label: 'Settings', route: 'Settings' },
  { icon: '❓', label: 'Help & Support', route: 'HelpSupport' },
];

export default function PlayerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { data: me, refetch } = useMe();
  const [showLogout, setShowLogout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  // me is the live source of truth; fall back to auth context while loading
  const displayName = me?.name ?? user?.name ?? '';
  const displayEmail = me?.email ?? user?.email ?? '';
  const displayAvatar = me?.avatar ?? user?.avatar;
  const isPremium = me?.isPremium ?? user?.isPremium ?? false;
  const totalBookings = me?.totalBookings ?? user?.totalBookings ?? 0;
  const sportsCount = (me?.preferredSports ?? user?.preferredSports ?? []).length;
  const createdAt = me?.createdAt ?? user?.createdAt;
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Profile" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={[styles.profileCard, shadow.card]}>
          <AvatarImage uri={displayAvatar} name={displayName} size={72} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          {isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>⭐ Premium Member</Text></View>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{totalBookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{sportsCount}</Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{memberSince}</Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.menu}>
          {ACCOUNT_MENU.map((m) => (
            <TouchableOpacity key={m.label} style={styles.menuRow} onPress={() => navigation.navigate(m.route)}>
              <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.menu}>
          {PREFS_MENU.map((m) => (
            <TouchableOpacity key={m.label} style={styles.menuRow} onPress={() => navigation.navigate(m.route)}>
              <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowLogout(true)}>
            <Text style={{ fontSize: 20 }}>🚪</Text>
            <Text style={[styles.menuLabel, { color: colors.danger }]}>Logout</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmActionModal
        visible={showLogout}
        title="Logout?"
        message="You'll need to login again to access your bookings."
        confirmLabel="Logout"
        danger
        onConfirm={() => { setShowLogout(false); toast.info('Signed out successfully.'); logout(); }}
        onDismiss={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  email: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  premiumBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, marginTop: spacing.md },
  premiumText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#B45309' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', ...shadow.card },
  statNum: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  sectionHeader: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.xs, marginLeft: spacing.xs },
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
});
