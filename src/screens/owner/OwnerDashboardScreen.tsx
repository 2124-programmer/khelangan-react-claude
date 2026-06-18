import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Pressable,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { NotificationBell, MetricCard } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { useOwnerDashboardSummary } from '../../api/hooks/useOwnerDashboard';

// ── Money formatter: ₹1234 → "₹1.2k", ₹12,34,567 → "₹12.3L"
function formatAmount(paise: number): string {
  if (paise >= 100_000) return `₹${(paise / 100_000).toFixed(1)}L`;
  if (paise >= 1_000)   return `₹${(paise / 1_000).toFixed(1)}k`;
  return `₹${paise.toLocaleString('en-IN')}`;
}

type BookingTabKey = 'requests' | 'today' | 'upcoming' | 'completed' | 'cancelled';

type DashboardNavigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

export default function OwnerDashboardScreen({ navigation }: { navigation: DashboardNavigation }) {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useOwnerDashboardSummary();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const goBookings = (initialTab: BookingTabKey) =>
    navigation.navigate('OwnerBookings', { screen: 'OwnerBookingsHome', params: { initialTab } });

  const earnings = data?.earnings;
  const bookings = data?.bookings;
  const stats = data?.stats;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.owner]}
            tintColor={colors.owner}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.hi}>Dashboard</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <NotificationBell />
        </View>

        {/* ── Error banner ── */}
        {isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Could not load dashboard.</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Today's Revenue hero card ── */}
        <Pressable
          onPress={() => navigation.navigate('EarningsTab')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.revenueCard, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Text style={styles.revLabel}>Today's Revenue</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.white} style={{ marginVertical: spacing.md }} />
          ) : (
            <Text style={styles.revAmount}>
              {formatAmount(earnings?.todayAmount ?? 0)}
            </Text>
          )}
          <View style={styles.revRow}>
            <Text style={styles.revSub}>
              {earnings?.todayBookingCount ?? 0} bookings today
            </Text>
            <Text style={styles.revSub}>
              Pending: {formatAmount(earnings?.pendingAmount ?? 0)}
            </Text>
          </View>
        </Pressable>

        {/* ── Week / Month stat cards ── */}
        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.statCard, shadow.card, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.navigate('EarningsTab')}
            accessibilityRole="button"
            hitSlop={4}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.owner} />
            ) : (
              <Text style={[styles.statValue, { color: colors.owner }]}>
                {formatAmount(earnings?.weekAmount ?? 0)}
              </Text>
            )}
            <Text style={styles.statLabel}>This Week</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.statCard, shadow.card, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.navigate('EarningsTab')}
            accessibilityRole="button"
            hitSlop={4}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {formatAmount(earnings?.monthAmount ?? 0)}
              </Text>
            )}
            <Text style={styles.statLabel}>This Month</Text>
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Action icon="➕" label="Add Venue"  onPress={() => navigation.navigate('AddVenue')} />
          <Action icon="📅" label="Calendar"   onPress={() => navigation.navigate('VenueCalendar', { venueId: '1' })} />
          <Action icon="💰" label="Earnings"   onPress={() => navigation.navigate('EarningsTab')} />
          <Action icon="⭐" label="Reviews"    onPress={() => navigation.navigate('ReviewsManagement')} />
          <Action icon="📋" label="Requests"   onPress={() => goBookings('requests')} />
        </View>

        {/* ── Bookings overview ── */}
        <Text style={styles.sectionTitle}>Bookings</Text>
        {isLoading ? (
          <View style={styles.placeholderGrid}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={styles.placeholder} />)}
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Today"
              value={String(bookings?.today ?? 0)}
              onPress={() => goBookings('today')}
            />
            <MetricCard
              title="Upcoming"
              value={String(bookings?.upcoming ?? 0)}
              accentColor={colors.owner}
              onPress={() => goBookings('upcoming')}
            />
            <MetricCard
              title="Completed (30d)"
              value={String(bookings?.completedLast30Days ?? 0)}
              accentColor={colors.success}
              onPress={() => goBookings('completed')}
            />
            <MetricCard
              title="Cancelled (30d)"
              value={String(bookings?.cancelledLast30Days ?? 0)}
              accentColor={colors.danger}
              onPress={() => goBookings('cancelled')}
            />
          </View>
        )}

        {/* ── Account overview ── */}
        <Text style={styles.sectionTitle}>Overview</Text>
        {isLoading ? (
          <View style={styles.placeholderGrid}>
            {[0, 1, 2].map((i) => <View key={i} style={styles.placeholder} />)}
          </View>
        ) : (
          <View style={styles.metricsRow}>
            <MetricCard
              title="Users connected"
              value={String(stats?.usersConnected ?? 0)}
            />
            <MetricCard
              title="My venues"
              value={String(stats?.venueCount ?? 0)}
              onPress={() => navigation.navigate('VenuesTab')}
            />
            <MetricCard
              title="Courts"
              value={String(stats?.courtCount ?? 0)}
              onPress={() => navigation.navigate('VenuesTab')}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Action({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.bg },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  hi:           { fontSize: fontSize.sm, color: colors.textMid },
  name:         { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  errorBanner:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEE2E2', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  errorText:    { fontSize: fontSize.sm, color: colors.danger },
  retryText:    { fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.bold },

  revenueCard:  { backgroundColor: colors.owner, borderRadius: radius.lg, padding: spacing.xl },
  revLabel:     { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  revAmount:    { fontSize: 38, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.xs },
  revRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  revSub:       { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)' },

  grid:         { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  statCard:     { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  statValue:    { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  statLabel:    { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },

  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  action:       { alignItems: 'center', gap: spacing.xs, width: '18%' },
  actionIcon:   { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  actionLabel:  { fontSize: fontSize.xs, color: colors.textMid, textAlign: 'center' },

  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap' },
  metricsRow:   { flexDirection: 'row', flexWrap: 'wrap' },

  placeholderGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  placeholder:     { flex: 1, minWidth: '40%', height: 72, margin: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
});
