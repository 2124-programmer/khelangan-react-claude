import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Pressable,
  Modal, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { NotificationBell, MetricCard, StatusBadge } from '../../components/common';
import { useAuth } from '../../store/AuthContext';
import { useOwnerDashboardSummary } from '../../api/hooks/useOwnerDashboard';
import { useBookings } from '../../api/hooks/useBookings';
import { useOwnerVenues } from '../../api/hooks/useVenues';
import type { Booking } from '../../types';

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

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function OwnerDashboardScreen({ navigation }: { navigation: DashboardNavigation }) {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useOwnerDashboardSummary();
  const [refreshing, setRefreshing] = useState(false);

  const { data: venuesData } = useOwnerVenues();
  const ownerVenues = venuesData?.venues ?? [];
  const [venuePicker, setVenuePicker] = useState(false);

  function openCalendar() {
    if (ownerVenues.length === 0) {
      Alert.alert('No venues', 'Add a venue first before viewing the calendar.');
      return;
    }
    if (ownerVenues.length === 1) {
      navigation.navigate('VenueCalendar', { venueId: ownerVenues[0].id });
      return;
    }
    setVenuePicker(true);
  }

  const todayStr = useMemo(() => getTodayStr(), []);
  const { data: todayData, isLoading: todayLoading } = useBookings({ date: todayStr });
  const todaySlots = useMemo<Booking[]>(() => {
    return (todayData?.bookings ?? [])
      .filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.status === 'checked_in')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [todayData]);

  const slotsByCourt = useMemo<Record<string, Booking[]>>(() => {
    const groups: Record<string, Booking[]> = {};
    todaySlots.forEach((b) => {
      const key = b.courtName || 'Unknown Court';
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return groups;
  }, [todaySlots]);

  const courtNames = useMemo(() => Object.keys(slotsByCourt).sort(), [slotsByCourt]);

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

        {/* ── Today's Occupied Slots ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Today's Slots</Text>
          <TouchableOpacity onPress={() => goBookings('today')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {todayLoading ? (
          <ActivityIndicator color={colors.owner} style={{ marginVertical: spacing.md }} />
        ) : todaySlots.length === 0 ? (
          <View style={styles.emptySlots}>
            <Text style={styles.emptySlotsText}>No bookings scheduled for today</Text>
          </View>
        ) : (
          <View style={[styles.slotsCard, shadow.card]}>
            {courtNames.map((courtName, ci) => {
              const slots = slotsByCourt[courtName];
              return (
                <View key={courtName}>
                  <View style={[styles.courtHeader, ci > 0 && styles.courtHeaderBorder]}>
                    <Text style={styles.courtHeaderIcon}>🏟</Text>
                    <Text style={styles.courtHeaderName}>{courtName}</Text>
                    <View style={styles.courtSlotBadge}>
                      <Text style={styles.courtSlotBadgeText}>{slots.length} slot{slots.length > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  {slots.map((slot, idx) => (
                    <CourtSlotRow
                      key={slot.id}
                      slot={slot}
                      last={idx === slots.length - 1}
                      onPress={() => navigation.navigate('OwnerBookings', {
                        screen: 'OwnerBookingsHome',
                        params: { initialTab: slot.status === 'confirmed' ? 'today' : 'completed' },
                      })}
                    />
                  ))}
                </View>
              );
            })}
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
            {ownerVenues.map((v) => (
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

function CourtSlotRow({ slot, last, onPress }: { slot: Booking; last: boolean; onPress: () => void }) {
  const isDone = slot.status === 'completed' || slot.status === 'checked_in';
  return (
    <TouchableOpacity onPress={onPress} style={[styles.slotRow, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.slotTimePill, isDone && { backgroundColor: colors.success + '22' }]}>
        <Text style={[styles.slotTime, isDone && { color: colors.success }]}>{slot.startTime}</Text>
        <Text style={[styles.slotTimeSep, isDone && { color: colors.success }]}>–</Text>
        <Text style={[styles.slotTime, isDone && { color: colors.success }]}>{slot.endTime}</Text>
      </View>
      <Text style={styles.slotPlayer} numberOfLines={1}>👤 {slot.playerName}</Text>
      <StatusBadge status={slot.status} />
    </TouchableOpacity>
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
  slotsCard:      { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },

  courtHeader:       { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceAlt, gap: spacing.xs },
  courtHeaderBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  courtHeaderIcon:   { fontSize: 13 },
  courtHeaderName:   { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  courtSlotBadge:    { backgroundColor: colors.owner + '20', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  courtSlotBadgeText:{ fontSize: 10, fontWeight: fontWeight.semibold, color: colors.owner },

  slotRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, paddingLeft: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  slotTimePill: { width: 88, backgroundColor: colors.owner + '18', borderRadius: radius.sm, paddingVertical: 4, paddingHorizontal: 6, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 2 },
  slotTime:     { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.owner },
  slotTimeSep:  { fontSize: 11, color: colors.owner },
  slotPlayer:   { flex: 1, fontSize: fontSize.xs, color: colors.textMid },

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
