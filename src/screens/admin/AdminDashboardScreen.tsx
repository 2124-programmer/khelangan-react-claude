import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import { AvatarImage, NotificationBell } from '../../components/common';
import { centeredContent } from '../../responsive';
import { useAuth } from '../../store/AuthContext';
import { useDashboardSummary } from '../../api/hooks/useAdmin';
import {
  PeriodToggle, MetricCard, HeroMetricCard, NeedsAttentionRow, QuietState, ManagementGrid,
  formatINR, formatCount, dashboardGreeting, resolveDeepLink,
} from '../../components/dashboard';
import type { DashboardPeriod, NeedsAttentionItem } from '../../types';

const QUIET_LABEL: Record<DashboardPeriod, string> = {
  TODAY: 'Quiet so far today',
  WEEK: 'Quiet so far this week',
  MONTH: 'Quiet so far this month',
};

export default function AdminDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('TODAY');
  const { data: summary, refetch, isLoading } = useDashboardSummary(period);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const { greeting, dateLabel } = dashboardGreeting(summary?.asOf);
  const go = (screen: string, params?: Record<string, string>) => resolveDeepLink(navigation, screen, params);
  const onAttention = (item: NeedsAttentionItem) =>
    resolveDeepLink(navigation, item.deepLinkScreen, item.deepLinkParams);

  // Court-change requests are super-admin-only (the queue 403s for other roles), so hide that tile
  // for non-super admins. The backend always includes it because the dashboard cache is role-agnostic.
  const isSuperAdmin = user?.adminRole === 'SUPER_ADMIN' || !user?.adminRole;
  const attentionItems = (summary?.needsAttention ?? []).filter(
    (i) => i.key !== 'COURT_CHANGE_REQUESTS' || isSuperAdmin,
  );

  // Period-bound metrics all zero → show a calm "quiet" line instead of a grid of zeros.
  const periodBoundZero = !!summary
    && summary.bookingsThisPeriod.value === 0
    && summary.newSignupsThisPeriod.value === 0
    && (summary.gbvThisPeriod?.amount ?? 0) === 0;

  const showFinancials = !!summary?.canViewFinancials;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {greeting}{dateLabel ? ` · ${dateLabel}` : ''}
            </Text>
            <Text style={styles.name}>{user?.name ?? 'Admin'}</Text>
          </View>
          <View style={styles.topBarActions}>
            <NotificationBell />
            <TouchableOpacity onPress={() => navigation.navigate('AdminProfile')}
              accessibilityRole="button" accessibilityLabel="Profile">
              <AvatarImage name={user?.name ?? 'Admin'} uri={user?.avatar ?? undefined} size={44} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period toggle */}
        <PeriodToggle period={period} onChange={setPeriod} />

        {summary ? (
          <>
            {/* MRR hero (financial) */}
            {showFinancials && summary.mrr ? (
              <HeroMetricCard mrr={summary.mrr} onPress={() => go('SubscriptionManagement')} />
            ) : null}

            {periodBoundZero ? <QuietState label={QUIET_LABEL[period]} /> : null}

            {/* Top metric cards */}
            <View style={styles.cardGrid}>
              <MetricCard
                label="Pending moderation"
                value={formatCount(summary.pendingModeration.value)}
                tone={summary.pendingModeration.value > 0 ? 'DANGER' : 'NEUTRAL'}
                onPress={() => go('Venues', { tab: 'PENDING' })}
              />
              <MetricCard
                label="New signups"
                value={formatCount(summary.newSignupsThisPeriod.value)}
                metric={summary.newSignupsThisPeriod}
                onPress={() => go('Players')}
              />
              <MetricCard
                label="Active venues"
                value={formatCount(summary.activeVenues.value)}
                onPress={() => go('Venues')}
              />
              <MetricCard
                label="Bookings"
                value={formatCount(summary.bookingsThisPeriod.value)}
                metric={summary.bookingsThisPeriod}
                onPress={() => go('AdminBookings')}
              />
              {showFinancials && summary.gbvThisPeriod ? (
                <MetricCard
                  label="Booking volume (GBV)"
                  value={formatINR(summary.gbvThisPeriod.amount)}
                  metric={summary.gbvThisPeriod}
                  onPress={() => go('AdminBookings')}
                />
              ) : null}
            </View>

            {/* Needs Attention */}
            <Text style={styles.sectionTitle}>Needs Attention</Text>
            <NeedsAttentionRow items={attentionItems} onPressItem={onAttention} />

            {/* Management */}
            <Text style={styles.sectionTitle}>Management</Text>
            <ManagementGrid counts={summary.counts} onPressTile={(route) => go(route)} />
          </>
        ) : (
          <Text style={styles.loading}>{isLoading ? 'Loading dashboard…' : 'Could not load dashboard.'}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  topBarActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  greeting: { fontSize: fontSize.sm, color: colors.textMid },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  loading: { fontSize: fontSize.md, color: colors.textMid, textAlign: 'center', marginTop: spacing.xxl },
});
