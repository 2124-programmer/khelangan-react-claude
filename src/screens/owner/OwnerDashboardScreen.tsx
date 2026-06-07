import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { BookingCard } from '../../components/venue';
import { NotificationBell } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { useOwnerStats } from '../../api/hooks/useAdmin';
import { useBookings } from '../../api/hooks/useBookings';

export default function OwnerDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { data: stats } = useOwnerStats();
  const { data: bookingsData } = useBookings({ page: 0 });
  const recentBookings = bookingsData?.bookings ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hi}>Dashboard</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <NotificationBell />
        </View>

        {/* Revenue card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revLabel}>Today's Revenue</Text>
          <Text style={styles.revAmount}>
            ₹{(stats?.todayRevenue ?? 0).toLocaleString('en-IN')}
          </Text>
          <View style={styles.revRow}>
            <Text style={styles.revSub}>{stats?.todayBookings ?? 0} bookings today</Text>
            <Text style={styles.revSub}>
              Pending: ₹{(stats?.pendingPayout ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <Stat
            label="This Week"
            value={`₹${((stats?.weekRevenue ?? 0) / 1000).toFixed(1)}k`}
            accent={colors.owner}
          />
          <Stat
            label="This Month"
            value={`₹${((stats?.monthRevenue ?? 0) / 1000).toFixed(0)}k`}
            accent={colors.primary}
          />
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <Action icon="➕" label="Add Venue" onPress={() => navigation.navigate('AddVenue')} />
          <Action icon="📅" label="Calendar" onPress={() => navigation.navigate('VenueCalendar', { venueId: '1' })} />
          <Action icon="💰" label="Earnings" onPress={() => navigation.navigate('EarningsTab')} />
          <Action icon="⭐" label="Reviews" onPress={() => navigation.navigate('ReviewsManagement')} />
        </View>

        {/* Recent bookings */}
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {recentBookings.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            viewAs="owner"
            onPress={() => navigation.navigate('OwnerBookingDetail', { bookingId: b.id })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={[styles.statCard, shadow.card]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}
function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <View style={styles.actionIcon}><Text style={{ fontSize: 22 }}>{icon}</Text></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  hi: { fontSize: fontSize.sm, color: colors.textMid },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  revenueCard: { backgroundColor: colors.owner, borderRadius: radius.lg, padding: spacing.xl },
  revLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  revAmount: { fontSize: 38, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.xs },
  revRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  revSub: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)' },
  grid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { alignItems: 'center', gap: spacing.xs },
  actionIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  actionLabel: { fontSize: fontSize.xs, color: colors.textMid },
});
