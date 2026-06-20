import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Pressable,
  Modal, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { NotificationBell, MetricCard } from '../../components/common';
import { BookingCard, GroupedBookingCard } from '../../components/venue';
import { CheckInConfirmModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { useOwnerDashboardSummary } from '../../api/hooks/useOwnerDashboard';
import { useBookings, useCheckInBooking, useCheckInBookingGroup } from '../../api/hooks/useBookings';
import { useOwnerVenues } from '../../api/hooks/useVenues';
import { groupBookingList, isGroup } from '../../utils/bookingUtils';
import { Booking, BookingGroup } from '../../types';

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

  const { data: venuesData, refetch: refetchVenues } = useOwnerVenues(undefined, { enabled: false });
  const pickerVenues = venuesData?.venues ?? [];
  const [venuePicker, setVenuePicker] = useState(false);

  async function openCalendar() {
    const venueCount = data?.stats?.venueCount ?? 0;
    if (venueCount === 0) {
      Alert.alert('No venues', 'Add a venue first before viewing the calendar.');
      return;
    }
    const result = await refetchVenues();
    const venues = result.data?.venues ?? [];
    if (venues.length === 1) {
      navigation.navigate('VenueCalendar', { venueId: venues[0].id });
    } else {
      setVenuePicker(true);
    }
  }

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const { data: todayBookingsData, refetch: refetchTodayBookings } = useBookings({ status: 'CONFIRMED', date: todayStr });
  const todayBookingItems = useMemo(
    () => groupBookingList(todayBookingsData?.bookings ?? []),
    [todayBookingsData],
  );

  const checkIn = useCheckInBooking();
  const checkInGroup = useCheckInBookingGroup();

  type PendingCheckIn =
    | { kind: 'single'; booking: Booking }
    | { kind: 'group'; group: BookingGroup; slotTimes: string };
  const [pendingCheckIn, setPendingCheckIn] = useState<PendingCheckIn | null>(null);

  const handleCheckInConfirm = async () => {
    if (!pendingCheckIn) return;
    try {
      if (pendingCheckIn.kind === 'single') {
        await checkIn.mutateAsync(Number(pendingCheckIn.booking.id));
      } else {
        await checkInGroup.mutateAsync(pendingCheckIn.group.groupId);
      }
    } catch {
      Alert.alert('Check-in Failed', 'Could not complete check-in. Please try again.');
    } finally {
      setPendingCheckIn(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([refetch(), refetchTodayBookings()]); } finally { setRefreshing(false); }
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
          <Action icon="📅" label="Calendar"   onPress={openCalendar} />
          <Action icon="💰" label="Earnings"   onPress={() => navigation.navigate('EarningsTab')} />
          <Action icon="⭐" label="Reviews"    onPress={() => navigation.navigate('ReviewsManagement')} />
          <Action icon="📋" label="Requests"   onPress={() => goBookings('requests')} />
        </View>


        {/* ── Bookings overview ── */}
        <Text style={styles.sectionTitle}>Bookings</Text>
        {isLoading ? (
          <View style={styles.bsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.bsCard, { backgroundColor: colors.surfaceAlt }]} />
            ))}
          </View>
        ) : (
          <View style={styles.bsRow}>
            <BookingStatCard icon="📋" count={bookings?.requests ?? 0}            color={colors.primary}  label="Pending"   onPress={() => goBookings('requests')} />
            <BookingStatCard icon="📅" count={bookings?.today ?? 0}               label="Today"            onPress={() => goBookings('today')} />
            <BookingStatCard icon="⏰" count={bookings?.upcoming ?? 0}            color={colors.owner}    label="Upcoming"  onPress={() => goBookings('upcoming')} />
            <BookingStatCard icon="✅" count={bookings?.completedLast30Days ?? 0} color={colors.success}  label="Done"      onPress={() => goBookings('completed')} />
            <BookingStatCard icon="❌" count={bookings?.cancelledLast30Days ?? 0} color={colors.danger}   label="Cancelled" onPress={() => goBookings('cancelled')} />
          </View>
        )}

        {/* ── Today's Bookings ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Today's Bookings</Text>
          <TouchableOpacity onPress={() => goBookings('today')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.owner} style={{ marginVertical: spacing.md }} />
        ) : todayBookingItems.length === 0 ? (
          <View style={styles.emptySlots}>
            <Text style={styles.emptySlotsText}>No bookings scheduled for today</Text>
          </View>
        ) : (
          todayBookingItems.map((item) => {
            if (isGroup(item)) {
              const sorted = item.bookings.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
              const contiguous = sorted.length > 1 && sorted.every((b, i) => i === 0 || b.startTime === sorted[i - 1].endTime);
              const slotTimes = contiguous
                ? `${sorted[0].startTime}–${sorted[sorted.length - 1].endTime}`
                : sorted.map((b) => `${b.startTime}–${b.endTime}`).join(', ');
              return (
                <GroupedBookingCard
                  key={item.groupId}
                  group={item}
                  viewAs="owner"
                  onCheckInAll={() => setPendingCheckIn({ kind: 'group', group: item, slotTimes })}
                  checkInPending={checkInGroup.isPending && checkInGroup.variables === item.groupId}
                />
              );
            }
            return (
              <BookingCard
                key={item.id}
                booking={item}
                viewAs="owner"
                onPress={() => goBookings('today')}
                onCheckIn={() => setPendingCheckIn({ kind: 'single', booking: item })}
              />
            );
          })
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
              onPress={() => navigation.navigate('VenuesTab', { screen: 'VenuesHome' })}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Venue picker modal (Calendar quick action, multiple venues) ── */}
      <Modal
        visible={venuePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setVenuePicker(false)}
      >
        <Pressable style={styles.pickerOverlay} onPress={() => setVenuePicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Select Venue</Text>
            {pickerVenues.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.pickerRow}
                onPress={() => {
                  setVenuePicker(false);
                  navigation.navigate('VenueCalendar', { venueId: v.id });
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerVenueName} numberOfLines={1}>{v.name}</Text>
                  <Text style={styles.pickerVenueAddr} numberOfLines={1}>📍 {v.address}</Text>
                </View>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setVenuePicker(false)}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {pendingCheckIn && (
        <CheckInConfirmModal
          visible
          playerName={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.playerName : pendingCheckIn.group.playerName ?? ''}
          venueName={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.venueName : pendingCheckIn.group.venueName}
          courtName={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.courtName : pendingCheckIn.group.courtName}
          date={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.date : pendingCheckIn.group.date}
          timeRange={
            pendingCheckIn.kind === 'single'
              ? `${pendingCheckIn.booking.startTime}–${pendingCheckIn.booking.endTime}`
              : pendingCheckIn.slotTimes
          }
          slotsCount={pendingCheckIn.kind === 'group' ? pendingCheckIn.group.bookings.length : undefined}
          total={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.amount : pendingCheckIn.group.totalAmount}
          onConfirm={handleCheckInConfirm}
          onDismiss={() => setPendingCheckIn(null)}
        />
      )}
    </SafeAreaView>
  );
}

function BookingStatCard({
  icon, count, label, color, onPress,
}: {
  icon: string; count: number; label: string; color?: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [styles.bsCard, shadow.card, { opacity: pressed ? 0.75 : 1 }]}
    >
      {/* <Text style={styles.bsIcon}>{icon}</Text> */}
      <Text style={[styles.bsCount, color ? { color } : undefined]}>{count}</Text>
      <Text style={styles.bsLabel}>{label}</Text>
    </Pressable>
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

  actionsGrid:  { flexDirection: 'row', justifyContent: 'space-between' },
  action:       { alignItems: 'center', gap: spacing.xs },
  actionIcon:   { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  actionLabel:  { fontSize: fontSize.xs, color: colors.textMid, textAlign: 'center' },

  metricsRow:   { flexDirection: 'row', flexWrap: 'wrap' },

  placeholderGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  placeholder:     { flex: 1, minWidth: '40%', height: 72, margin: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },

  bsRow:   { flexDirection: 'row' },
  bsCard:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, marginHorizontal: 3, borderWidth: 1, borderColor: colors.border, minHeight: 84 },
  bsIcon:  { fontSize: 22 },
  bsCount: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
  bsLabel: { fontSize: 9, color: colors.textDim, marginTop: 2, textAlign: 'center' },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  seeAll:         { fontSize: fontSize.sm, color: colors.owner, fontWeight: fontWeight.semibold },
  emptySlots:     { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  emptySlotsText: { fontSize: fontSize.sm, color: colors.textDim },

  // Venue picker modal
  pickerOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet:      { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  pickerHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  pickerTitle:      { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  pickerVenueName:  { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  pickerVenueAddr:  { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  pickerChevron:    { fontSize: 22, color: colors.textDim, paddingLeft: spacing.sm },
  pickerCancel:     { marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md },
  pickerCancelText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
});
