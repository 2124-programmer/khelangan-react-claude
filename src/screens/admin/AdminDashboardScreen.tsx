import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { useAuth } from '../../store/AuthContext';
import { ADMIN_KPIS } from '../../data/mockData';

export default function AdminDashboardScreen({ navigation }: any) {
  const { user } = useAuth();

  const kpis = [
    { label: 'Bookings Today', value: ADMIN_KPIS.bookingsToday, icon: '📅', accent: colors.admin },
    { label: 'Revenue Today', value: `₹${ADMIN_KPIS.revenueToday.toLocaleString('en-IN')}`, icon: '💰', accent: colors.primary },
    { label: 'New Users', value: ADMIN_KPIS.newUsers, icon: '👥', accent: colors.owner },
    { label: 'Active Venues', value: ADMIN_KPIS.activeVenues, icon: '🏟', accent: colors.warning },
  ];

  const alerts = [
    { label: 'Pending Approvals', value: ADMIN_KPIS.pendingApprovals, route: 'VenueApproval', icon: '🕓' },
    { label: 'Open Disputes', value: ADMIN_KPIS.openDisputes, route: 'DisputeManagement', icon: '⚠️' },
  ];

  const modules = [
    { label: 'Approvals', icon: '✅', route: 'VenueApproval' },
    { label: 'Venues', icon: '🏟', route: 'VenueManagement' },
    { label: 'Players', icon: '👤', route: 'PlayerManagement' },
    { label: 'Owners', icon: '🧑‍💼', route: 'OwnerManagement' },
    { label: 'Bookings', icon: '📋', route: 'AdminBookings' },
    { label: 'Payments', icon: '💳', route: 'PaymentsRevenue' },
    { label: 'Disputes', icon: '⚖️', route: 'DisputeManagement' },
    { label: 'Coupons', icon: '🎟️', route: 'CouponManagement' },
    { label: 'Broadcast', icon: '📢', route: 'NotificationBroadcast' },
    { label: 'Analytics', icon: '📊', route: 'Analytics' },
    { label: 'Categories', icon: '🏷️', route: 'CategoryManagement' },
    { label: 'CMS', icon: '📄', route: 'CMS' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hi}>Admin Panel</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('AdminSettings')}>
            <View style={styles.gear}><Text style={{ fontSize: 20 }}>⚙️</Text></View>
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          {kpis.map((k) => (
            <View key={k.label} style={[styles.kpiCard, shadow.card]}>
              <Text style={{ fontSize: 22 }}>{k.icon}</Text>
              <Text style={[styles.kpiValue, { color: k.accent }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        {/* Alerts */}
        <Text style={styles.sectionTitle}>Needs Attention</Text>
        {alerts.map((a) => (
          <TouchableOpacity key={a.label} style={styles.alertRow} onPress={() => navigation.navigate(a.route)}>
            <Text style={{ fontSize: 22 }}>{a.icon}</Text>
            <Text style={styles.alertLabel}>{a.label}</Text>
            <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{a.value}</Text></View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Modules */}
        <Text style={styles.sectionTitle}>Management</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity key={m.label} style={styles.module} onPress={() => navigation.navigate(m.route)}>
              <Text style={{ fontSize: 26 }}>{m.icon}</Text>
              <Text style={styles.moduleLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  hi: { fontSize: fontSize.sm, color: colors.textMid },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  gear: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  kpiValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  kpiLabel: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  alertLabel: { flex: 1, fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.semibold },
  alertBadge: { backgroundColor: colors.danger, borderRadius: radius.pill, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  alertBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  arrow: { fontSize: 22, color: colors.textDim },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  module: { width: '22%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, ...shadow.card },
  moduleLabel: { fontSize: 10, color: colors.textMid, textAlign: 'center' },
});
