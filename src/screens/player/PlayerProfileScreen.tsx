import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AvatarImage } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';

const MENU = [
  { icon: '🔔', label: 'Notifications', route: 'Notifications' },
  { icon: '👛', label: 'Wallet & Payments', route: 'Wallet' },
  { icon: '🎟️', label: 'Offers & Coupons', route: 'Offers' },
  { icon: '❓', label: 'Help & Support', route: 'HelpSupport' },
  { icon: '⚙️', label: 'Settings', route: 'Settings' },
  { icon: '🏟', label: 'Switch to Venue Owner', route: 'RoleChange', params: { targetRole: 'OWNER' } },
];

export default function PlayerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.profileCard, shadow.card]}>
          <AvatarImage uri={user?.avatar} name={user?.name ?? ''} size={72} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>⭐ Premium Member</Text></View>}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user?.totalBookings}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>2</Text>
            <Text style={styles.statLabel}>Sports</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU.map((m) => (
            <TouchableOpacity key={m.label} style={styles.menuRow} onPress={() => navigation.navigate(m.route, (m as any).params)}>
              <Text style={{ fontSize: 20 }}>{m.icon}</Text>
              <Text style={[styles.menuLabel, m.route === 'RoleChange' && { color: colors.owner }]}>{m.label}</Text>
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
        onConfirm={() => { setShowLogout(false); logout(); }}
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
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
});
