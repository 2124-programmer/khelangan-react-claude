import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { PlanBadge } from '../../components/PlanBadge';
import { PlanComparison } from '../../components/PlanComparison';
import { resolvePlanCode } from '../../theme/planMeta';
import {
  AppHeader, AppButton, AppInput, SectionTabBar,
  StatusBadge, EmptyState, SportChip, HourPickerDropdown, AvatarImage, LoadingOverlay
} from '../../components/common';
import { BookingCard, GroupedBookingCard, VenueImagePicker, PickedImage } from '../../components/venue';
import { ReviewCard, ReviewsEmptyState } from '../../components/reviews';
import { ConfirmActionModal, CheckInConfirmModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { useBookings, useBookingDetail, useAcceptBooking, useRejectBooking, useAcceptBookingGroup, useRejectBookingGroup, useCheckInBooking, useCheckInBookingGroup } from '../../api/hooks/useBookings';
import { useOwnerSettings, useUpdateOwnerSettings } from '../../api/hooks/useSettings';
import { useOwnerStats } from '../../api/hooks/useAdmin';
import { useOwnerPayouts } from '../../api/hooks/usePayouts';
import { useOwnerReviews } from '../../api/hooks/useReviews';
import { useVenueDetail, useUpdateVenue, useUploadVenueImage, useOwnerVenues } from '../../api/hooks/useVenues';
import { useOwnerVenueSubscription, useOwnerPlans, useCreateUpgradeRequest } from '../../api/hooks/useSubscription';
import { useSports } from '../../api/hooks/useSports';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../api/hooks/useNotifications';
import { useMe } from '../../api/hooks/useUser';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { parseLatLng, formatLatLng } from '../../utils/locationUtils';
import { formatRelativeTime, useNow } from '../../utils/dateUtils';
import { AppNotification, Booking, BookingGroup, SubscriptionStatus } from '../../types';
import type { SubscriptionPlan } from '../../types';
import { groupBookingList, isGroup, isExpiredPending } from '../../utils/bookingUtils';

// ─── Edit-venue constants (mirror AddVenueScreen) ───────────────────────────

const AMENITIES_LIST = [
  'Parking', 'Floodlights', 'Washroom', 'Drinking Water',
  'AC', 'Cafeteria', 'First Aid', 'Equipment Rental', 'Locker Room',
];

function formatHour(h24: string): string {
  const h = parseInt(h24.split(':')[0], 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:00 ${period}`;
}

function FieldErr({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <Text style={styles.eFieldError}>{msg}</Text>;
}

/* ───────────────── BookingManagementScreen ───────────────── */

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Each tab maps to the exact query params sent to the backend.
// Different params → different React Query cache keys → tab switch always hits the API.
type TabKey = 'requests' | 'today' | 'upcoming' | 'completed' | 'cancelled';

function tabQueryParams(tab: TabKey): { status?: string; date?: string; dateFrom?: string } {
  switch (tab) {
    case 'requests':  return { status: 'PENDING' };
    case 'today':     return { status: 'CONFIRMED', date: getTodayStr() };
    case 'upcoming':  return { status: 'CONFIRMED', dateFrom: getTomorrowStr() };
    case 'completed': return { status: 'COMPLETED' };
    case 'cancelled': return { status: 'CANCELLED' };
  }
}

const REFRESH_COOLDOWN_SECS = 12;

export function BookingManagementScreen({ navigation, route }: any) {
  const routeTab = (route?.params?.initialTab as TabKey | undefined);
  const [tab, setTab] = useState<TabKey>(routeTab ?? 'requests');
  const [refreshing, setRefreshing] = useState(false);

  // Re-sync when navigated to this screen with a different initialTab param
  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab]);
  // Counts down from REFRESH_COOLDOWN_SECS → 0; button is disabled while > 0
  const [cooldownSecs, setCooldownSecs] = useState(0);

  const todayStr = useMemo(getTodayStr, []);
  const params = useMemo(() => tabQueryParams(tab), [tab]);

  // Primary query — params change per tab, so each tab triggers its own API call
  const { data, isLoading, refetch } = useBookings(params);

  // PENDING second query — only enabled on the Cancelled tab to surface expired pending requests
  const { data: pendingData, refetch: refetchPending } = useBookings(
    { status: 'PENDING' },
    { enabled: tab === 'cancelled' }
  );

  // CHECKED_IN second query — only enabled on the Completed tab so checked-in bookings appear alongside COMPLETED ones
  const { data: checkedInData, refetch: refetchCheckedIn } = useBookings(
    { status: 'CHECKED_IN' },
    { enabled: tab === 'completed' }
  );

  // Tick the cooldown down by 1 every second until it reaches 0
  useEffect(() => {
    if (cooldownSecs <= 0) return;
    const timer = setTimeout(() => setCooldownSecs((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownSecs]);

  const handleRefresh = async () => {
    if (refreshing || cooldownSecs > 0) return;
    setRefreshing(true);
    try {
      await refetch();
      if (tab === 'cancelled') await refetchPending();
      if (tab === 'completed') await refetchCheckedIn();
    } finally {
      setRefreshing(false);
      setCooldownSecs(REFRESH_COOLDOWN_SECS);
    }
  };

  const acceptGroup = useAcceptBookingGroup();
  const rejectGroup = useRejectBookingGroup();
  const checkIn = useCheckInBooking();
  const checkInGroup = useCheckInBookingGroup();

  // Check-in confirmation modal state
  type PendingCheckIn =
    | { kind: 'single'; booking: Booking }
    | { kind: 'group'; group: BookingGroup; slotTimes: string };
  const [pendingCheckIn, setPendingCheckIn] = useState<PendingCheckIn | null>(null);

  const handleCheckInConfirm = async () => {
    if (!pendingCheckIn) return;
    if (pendingCheckIn.kind === 'single') {
      await checkIn.mutateAsync(Number(pendingCheckIn.booking.id));
    } else {
      await checkInGroup.mutateAsync(pendingCheckIn.group.groupId);
    }
    setPendingCheckIn(null);
  };

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let list = [...(data?.bookings ?? [])];

    if (tab === 'requests') {
      // Backend returns only PENDING; remove the few that have already expired (24 h window)
      list = list.filter((b) => !isExpiredPending(b, todayStr, nowMins));
      list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else if (tab === 'today') {
      // Backend already filters by date=today; sort by start time
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    } else if (tab === 'upcoming') {
      // Backend already filters by dateFrom=tomorrow; sort chronologically
      list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else if (tab === 'completed') {
      const checkedIn = checkedInData?.bookings ?? [];
      // Backend already includes CHECKED_IN when COMPLETED is queried — deduplicate by id
      const seen = new Set(list.map((b) => b.id));
      list = [...list, ...checkedIn.filter((b) => !seen.has(b.id))];
      list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    } else if (tab === 'cancelled') {
      // Merge CANCELLED + expired PENDING (fetched only when this tab is active)
      const expired = (pendingData?.bookings ?? []).filter((b) => isExpiredPending(b, todayStr, nowMins));
      list = [...list, ...expired];
      list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    }

    return list;
  }, [data, pendingData, checkedInData, tab, todayStr]);

  const items = groupBookingList(filteredBookings);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Bookings" onBack={() => navigation.goBack()} />
      <SectionTabBar
        tabs={[
          { label: 'Requests', value: 'requests' },
          { label: 'Today', value: 'today' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
        activeTab={tab}
        onChange={(t) => setTab(t as TabKey)}
      />
      {/* Fixed refresh bar — stays visible while scrolling */}
      <View style={styles.bmsRefreshBar}>
        <Text style={styles.bmsRefreshLabel}>
          {isLoading || refreshing ? 'Loading…' : `${items.length} result${items.length !== 1 ? 's' : ''}`}
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={refreshing || cooldownSecs > 0}
          style={[styles.bmsRefreshBtn, (refreshing || cooldownSecs > 0) && { opacity: 0.4 }]}
        >
          <Text style={styles.bmsRefreshIcon}>↻</Text>
          <Text style={styles.bmsRefreshText}>
            {refreshing ? 'Loading…' : cooldownSecs > 0 ? `${cooldownSecs}s` : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : items.length === 0 ? (
          <EmptyState icon="📅" title="No bookings" subtitle="" />
        ) : (
          items.map((item) => {
            const showContact = tab === 'today' || tab === 'upcoming' || tab === 'completed';
            const tabCtx = showContact ? tab as 'today' | 'upcoming' | 'completed' : undefined;
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
                  showContact={showContact}
                  tabCtx={tabCtx}
                  onAcceptAll={tab === 'requests' ? () => acceptGroup.mutate(item.groupId) : undefined}
                  onRejectAll={tab === 'requests' ? () => rejectGroup.mutate(item.groupId) : undefined}
                  onCheckInAll={tab === 'today' ? () => setPendingCheckIn({ kind: 'group', group: item, slotTimes }) : undefined}
                  acceptPending={acceptGroup.isPending && acceptGroup.variables === item.groupId}
                  rejectPending={rejectGroup.isPending && rejectGroup.variables === item.groupId}
                  checkInPending={checkInGroup.isPending && checkInGroup.variables === item.groupId}
                />
              );
            }
            return (
              <BookingCard
                key={item.id}
                booking={item}
                viewAs="owner"
                showContact={showContact}
                tabCtx={tabCtx}
                onPress={() => navigation.navigate('OwnerBookingDetail', { bookingId: item.id })}
                onCheckIn={tab === 'today' ? () => setPendingCheckIn({ kind: 'single', booking: item }) : undefined}
              />
            );
          })
        )}
      </ScrollView>

      {/* Check-in confirmation modal */}
      {pendingCheckIn && (
        <CheckInConfirmModal
          visible
          playerName={pendingCheckIn.kind === 'single' ? pendingCheckIn.booking.playerName : pendingCheckIn.group.playerName}
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

/* ───────────────── OwnerBookingDetailScreen ───────────────── */
export function OwnerBookingDetailScreen({ navigation, route }: any) {
  const { data: booking, isLoading } = useBookingDetail(route.params.bookingId);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();
  const checkInBooking = useCheckInBooking();

  if (isLoading || !booking) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Booking Details" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={isLoading} />
      </SafeAreaView>
    );
  }

  const handleAccept = async () => {
    await acceptBooking.mutateAsync(Number(booking.id));
    navigation.goBack();
  };

  const handleReject = async () => {
    await rejectBooking.mutateAsync(Number(booking.id));
    setShowReject(false);
    navigation.goBack();
  };

  const actionInFlight = acceptBooking.isPending || rejectBooking.isPending;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Booking Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.card, shadow.card]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.bId}>#{booking.id.toUpperCase()}</Text>
            <StatusBadge status={booking.status} />
          </View>
          <View style={styles.divider} />
          <DRow label="Player" value={booking.playerName} />
          <DRow label="Venue" value={booking.venueName} />
          <DRow label="Sport / Court" value={`${booking.sport} · ${booking.courtName}`} />
          <DRow label="Date" value={booking.date} />
          <DRow label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <View style={styles.divider} />
          <DRow label="Booking Amount" value={`₹${booking.amount}`} />
          <DRow label="Platform Commission" value={`- ₹${booking.commission}`} />
          <DRow label="Your Earning" value={`₹${booking.amount - booking.commission}`} bold />
        </View>

        {booking.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
            <AppButton
              label={acceptBooking.isPending ? 'Accepting…' : 'Accept'}
              loading={acceptBooking.isPending}
              disabled={actionInFlight}
              onPress={handleAccept}
              style={{ flex: 1 }}
            />
            <AppButton
              label="Reject"
              variant="danger"
              disabled={actionInFlight}
              onPress={() => setShowReject(true)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {booking.status === 'confirmed' && (
          <AppButton label="Mark as Checked-In" onPress={() => setShowCheckIn(true)} style={{ marginTop: spacing.xl }} />
        )}
      </ScrollView>

      <ConfirmActionModal
        visible={showCheckIn}
        title="Check-in Player?"
        message={`Confirm that ${booking.playerName} has arrived.`}
        confirmLabel="Check In"
        onConfirm={async () => {
          try {
            await checkInBooking.mutateAsync(Number(booking.id));
          } catch (err) {
            Alert.alert('Check-in Failed', extractApiError(err));
          } finally {
            setShowCheckIn(false);
            navigation.goBack();
          }
        }}
        onDismiss={() => setShowCheckIn(false)}
      />

      <ConfirmActionModal
        visible={showReject}
        title="Reject Booking?"
        message={`Reject ${booking.playerName}'s booking request for ${booking.date}? The slot will be released.`}
        confirmLabel="Reject"
        onConfirm={handleReject}
        onDismiss={() => setShowReject(false)}
      />
    </SafeAreaView>
  );
}

/* ───────────────── EarningsScreen ───────────────── */
export function EarningsScreen({ navigation }: any) {
  const { data: stats, refetch: refetchStats } = useOwnerStats();
  const { data, refetch: refetchPayouts } = useOwnerPayouts();
  const payouts = data?.payouts ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([refetchStats(), refetchPayouts()]); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Earnings" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.earnCard}>
          <Text style={styles.earnLabel}>Total This Month</Text>
          <Text style={styles.earnAmount}>₹{(stats?.monthRevenue ?? 0).toLocaleString('en-IN')}</Text>
          <View style={styles.earnRow}>
            <View>
              <Text style={styles.earnSubVal}>₹{(stats?.weekRevenue ?? 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.earnSubLabel}>This Week</Text>
            </View>
            <View>
              <Text style={styles.earnSubVal}>₹{(stats?.pendingPayout ?? 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.earnSubLabel}>Pending Payout</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payout History</Text>
        {payouts.map((p) => (
          <View key={p.id} style={styles.payoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payoutAmount}>₹{p.netAmount.toLocaleString('en-IN')}</Text>
              <Text style={styles.payoutMeta}>Gross ₹{p.amount.toLocaleString('en-IN')} · {p.date}</Text>
            </View>
            <StatusBadge status={p.status} />
          </View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Payouts are settled weekly after deducting the platform commission.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── ReviewsManagementScreen ───────────────── */
export function ReviewsManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useOwnerReviews();
  const reviews = data?.reviews ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Reviews" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : reviews.length === 0 ? (
          <ReviewsEmptyState />
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} showVenueName />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerProfileScreen ───────────────── */
export function OwnerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { data: me } = useMe();
  const [showLogout, setShowLogout] = useState(false);

  const displayName   = me?.name   ?? user?.name   ?? '';
  const displayEmail  = me?.email  ?? user?.email  ?? '';
  const displayAvatar = me?.avatar ?? user?.avatar;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <TouchableOpacity
          style={[styles.profileCard, shadow.card]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('OwnerEditProfile')}
        >
          <View style={styles.oAvatarWrapper}>
            <AvatarImage uri={displayAvatar} name={displayName} size={72} />
            <View style={styles.oPencilBadge}>
              <Text style={styles.oPencilIcon}>✏️</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>
        </TouchableOpacity>

        <Text style={styles.oSectionHeader}>Account</Text>
        <View style={styles.oMenuSection}>
          {[
            { icon: '✏️', label: 'Edit Profile', onPress: () => navigation.navigate('OwnerEditProfile') },
            { icon: '🔒', label: 'Security', onPress: () => navigation.navigate('Security') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.oSectionHeader}>Business</Text>
        <View style={styles.oMenuSection}>
          {[
            { icon: '🏟', label: 'My Venues', onPress: () => navigation.navigate('VenuesTab') },
            { icon: '📋', label: 'Subscription / My Plan', onPress: () => navigation.navigate('Subscription') },
            { icon: '💰', label: 'Bank & Payouts', onPress: () => navigation.navigate('EarningsTab') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.oSectionHeader}>Preferences</Text>
        <View style={styles.oMenuSection}>
          {[
            { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('OwnerNotifications') },
            { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('OwnerSettings') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
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
        message="You'll need to login again to access your account."
        confirmLabel="Logout"
        danger
        onConfirm={() => { setShowLogout(false); toast.info('Signed out successfully.'); logout(); }}
        onDismiss={() => setShowLogout(false)}
      />
    </SafeAreaView>
  );
}

/* ───────────────── EditVenueScreen ───────────────── */
export function EditVenueScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { data: venue, isLoading: venueLoading } = useVenueDetail(venueId);
  const { data: allSports = [] } = useSports();
  const updateVenue = useUpdateVenue();
  const uploadImage = useUploadVenueImage();

  // ── Form state ───────────────────────────────────────────────────────────
  const [name, setName]               = useState('');
  const [desc, setDesc]               = useState('');
  const [address, setAddress]         = useState('');
  const [city, setCity]               = useState('');
  const [state, setStateVal]          = useState('');
  const [pincode, setPincode]         = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [selectedSports, setSports]   = useState<string[]>([]);
  const [selectedAmenities, setAmen]  = useState<string[]>([]);
  const [openTime, setOpenTime]       = useState('05:00');
  const [closeTime, setCloseTime]     = useState('23:00');
  const [price, setPrice]             = useState('');
  const [isActive, setIsActive]       = useState(true);
  const [latlong, setLatlong]         = useState('');
  const [images, setImages]           = useState<PickedImage[]>([]);
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [prefilled, setPrefilled]     = useState(false);

  // ── Prefill once venue loads ─────────────────────────────────────────────
  useEffect(() => {
    if (venue && !prefilled) {
      setName(venue.name);
      setDesc(venue.description);
      setAddress(venue.address);
      setCity(venue.city);
      setStateVal(venue.state);
      setPincode(venue.pincode);
      setPhone(venue.contactPhone);
      setEmail(venue.contactEmail ?? '');
      setSports(venue.sports);
      setAmen(venue.amenities);
      setOpenTime(venue.openTime);
      setCloseTime(venue.closeTime);
      setPrice(String(venue.pricePerHour));
      setIsActive(venue.isActive);
      setLatlong(venue.lat && venue.lng ? formatLatLng(venue.lat, venue.lng) : '');
      setImages((venue.images ?? []).map((img) => ({ uri: img.url, isPrimary: img.isPrimary })));
      setPrefilled(true);
    }
  }, [venue, prefilled]);

  // ── Validation ───────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Venue name is required';
    if (!address.trim()) errs.address = 'Address is required';
    if (!city.trim()) errs.city = 'City is required';
    if (pincode && !/^\d{6}$/.test(pincode)) errs.pincode = 'Pincode must be exactly 6 digits';
    if (!phone.trim()) errs.phone = 'Contact phone is required';
    else if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (selectedSports.length === 0) errs.sports = 'Select at least one sport';
    const open  = parseInt(openTime.split(':')[0], 10);
    const close = parseInt(closeTime.split(':')[0], 10);
    if (close <= open) errs.hours = 'Closing time must be after opening time';
    if (!price.trim()) errs.price = 'Price per hour is required';
    else if (isNaN(Number(price)) || Number(price) < 0) errs.price = 'Enter a valid price';
    if (latlong.trim() && !parseLatLng(latlong.trim()))
      errs.latlong = 'Enter valid coordinates like "20.015164, 73.84228"';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      // Separate new local images from already-uploaded ones
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (img.uri.startsWith('http')) {
          uploadedUrls.push(img.uri);
        } else {
          const res = await uploadImage.mutateAsync(img.uri);
          uploadedUrls.push(res.url);
        }
      }

      const primaryIdx = images.findIndex((i) => i.isPrimary);
      const coverPhoto  = uploadedUrls[primaryIdx >= 0 ? primaryIdx : 0];

      const coords = latlong.trim() ? parseLatLng(latlong.trim()) : null;

      await updateVenue.mutateAsync({
        id: Number(venueId),
        data: {
          name:         name.trim(),
          description:  desc.trim() || undefined,
          address:      address.trim(),
          city:         city.trim(),
          state:        state.trim() || undefined,
          pincode:      pincode.trim() || undefined,
          contactPhone: phone.trim(),
          contactEmail: email.trim() || undefined,
          sportIds:     selectedSports.map(Number),
          amenities:    selectedAmenities,
          openTime,
          closeTime,
          pricePerHour: parseInt(price, 10),
          isActive,
          lat:          coords?.lat ?? venue?.lat ?? 0,
          lng:          coords?.lng ?? venue?.lng ?? 0,
          coverPhoto,
          photos:       uploadedUrls,
        },
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Save Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const toggleItem = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (venueLoading || !prefilled) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Edit Venue" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={venueLoading} />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Edit Venue" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }} keyboardShouldPersistTaps="handled">

        {/* ── Basic Info ── */}
        <Text style={styles.eSectionTitle}>Basic Info</Text>
        <AppInput label="Venue Name *" value={name}
          onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }} />
        <FieldErr msg={errors.name} />
        <AppInput label="Description" value={desc} onChangeText={setDesc} multiline
          placeholder="Describe your venue" />

        {/* ── Address ── */}
        <Text style={styles.eSectionTitle}>Address</Text>
        <AppInput label="Street Address *" value={address} multiline
          onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: '' })); }}
          placeholder="Plot no., street, area" />
        <FieldErr msg={errors.address} />
        <AppInput label="City *" value={city}
          onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: '' })); }}
          placeholder="e.g. Nashik" />
        <FieldErr msg={errors.city} />
        <AppInput label="State" value={state} onChangeText={setStateVal} placeholder="e.g. Maharashtra" />
        <AppInput label="Pincode (6 digits)" value={pincode} keyboardType="numeric" maxLength={6}
          onChangeText={(v) => { setPincode(v); setErrors((e) => ({ ...e, pincode: '' })); }}
          placeholder="e.g. 422001" />
        <FieldErr msg={errors.pincode} />
        <AppInput
          label="Location Coordinates (optional)"
          value={latlong}
          onChangeText={(v) => { setLatlong(v); setErrors((e) => ({ ...e, latlong: '' })); }}
          placeholder="e.g. 20.015164, 73.84228"
          autoCapitalize="none"
        />
        <FieldErr msg={errors.latlong} />

        {/* ── Contact ── */}
        <Text style={styles.eSectionTitle}>Contact</Text>
        <AppInput label="Contact Phone *" value={phone} keyboardType="phone-pad" maxLength={10}
          onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: '' })); }}
          placeholder="10-digit mobile number" />
        <FieldErr msg={errors.phone} />
        <AppInput label="Contact Email" value={email} keyboardType="email-address" autoCapitalize="none"
          onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
          placeholder="owner@example.com" />
        <FieldErr msg={errors.email} />

        {/* ── Sports ── */}
        <Text style={styles.eSectionTitle}>Sports Offered *</Text>
        <View style={styles.eWrap}>
          {allSports.map((s) => (
            <SportChip key={s.id} icon={s.icon} name={s.name}
              active={selectedSports.includes(s.id)}
              onPress={() => { toggleItem(selectedSports, setSports, s.id); setErrors((e) => ({ ...e, sports: '' })); }} />
          ))}
        </View>
        <FieldErr msg={errors.sports} />

        {/* ── Amenities ── */}
        <Text style={styles.eSectionTitle}>Amenities</Text>
        <View style={styles.eWrap}>
          {AMENITIES_LIST.map((a) => (
            <TouchableOpacity key={a}
              onPress={() => toggleItem(selectedAmenities, setAmen, a)}
              style={[styles.eChip, selectedAmenities.includes(a) && styles.eChipActive]}>
              <Text style={[styles.eChipText, selectedAmenities.includes(a) && { color: colors.white }]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hours ── */}
        <Text style={styles.eSectionTitle}>Operating Hours</Text>
        <HourPickerDropdown label="Opening Hour *" value={openTime}
          onChange={(v) => { setOpenTime(v); setErrors((e) => ({ ...e, hours: '' })); }}
          minHour={0} maxHour={22} />
        <HourPickerDropdown label="Closing Hour *" value={closeTime}
          onChange={(v) => { setCloseTime(v); setErrors((e) => ({ ...e, hours: '' })); }}
          minHour={parseInt(openTime.split(':')[0], 10) + 1} maxHour={23} />
        <View style={styles.eHoursPreview}>
          <Text style={styles.eHoursPreviewText}>
            {formatHour(openTime)} – {formatHour(closeTime)}
            {'  '}({parseInt(closeTime.split(':')[0], 10) - parseInt(openTime.split(':')[0], 10)} slots/day)
          </Text>
        </View>
        <FieldErr msg={errors.hours} />

        {/* ── Pricing ── */}
        <Text style={styles.eSectionTitle}>Pricing & Availability</Text>
        <AppInput label="Price per Hour (₹) *" value={price} keyboardType="numeric"
          onChangeText={(v) => { setPrice(v); setErrors((e) => ({ ...e, price: '' })); }}
          placeholder="e.g. 800" />
        <FieldErr msg={errors.price} />
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>Venue is Active</Text>
          </View>
          <Switch value={isActive} onValueChange={setIsActive}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white} />
        </View>

        {/* ── Photos ── */}
        <Text style={styles.eSectionTitle}>Photos</Text>
        <View style={styles.eInfoBox}>
          <Text style={styles.eInfoText}>
            First / starred photo is the venue cover. Add, remove, reorder, or replace images.
            New photos are cropped to 16:9 and compressed automatically.
          </Text>
        </View>
        <View style={{ marginTop: spacing.md }}>
          <VenueImagePicker images={images} onChange={setImages} uploading={loading} />
        </View>

        <AppButton
          label={loading ? 'Saving…' : 'Save Changes'}
          loading={loading}
          onPress={handleSave}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerNotificationsScreen ───────────────── */
const NOTIF_ICONS: Record<string, string> = {
  booking: '📋', payment: '💰', offer: '🎉', review: '⭐', system: '🔔',
};

// Parses the booking date (and optionally the last slot end time) from a
// notification body like "…on 2026-06-10 (05:00–06:00, 06:00–07:00)…"
// and returns true when the slot has already passed.
function isNotifSlotPast(body: string, todayStr: string, nowMins: number): boolean {
  const dateMatch = body.match(/\bon (\d{4}-\d{2}-\d{2})\b/);
  if (!dateMatch) return false;

  const bookingDate = dateMatch[1];
  if (bookingDate < todayStr) return true;

  if (bookingDate === todayStr) {
    const bracketMatch = body.match(/\(([^)]+)\)/);
    if (bracketMatch) {
      const times = bracketMatch[1].match(/\d{2}:\d{2}/g);
      if (times && times.length > 0) {
        const [h, m] = times[times.length - 1].split(':').map(Number);
        return h * 60 + m <= nowMins;
      }
    }
  }
  return false;
}

export function OwnerNotificationsScreen({ navigation }: any) {
  useNow();
  const { data, isLoading, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  // Refresh on focus so a request actioned elsewhere (e.g. the Bookings tab, which dismisses the
  // owner's request notification server-side) no longer shows stale Accept/Reject buttons here.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { refetch(); });
    return unsub;
  }, [navigation, refetch]);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();
  const acceptGroup = useAcceptBookingGroup();
  const rejectGroup = useRejectBookingGroup();

  // Tracks referenceIds actioned this session — prevents double-fire and hides
  // buttons immediately without waiting for a server round-trip.
  const [actionedRefs, setActionedRefs] = useState<Set<string>>(new Set());
  const [loadingRef, setLoadingRef] = useState<string | null>(null);

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllSiblingNotifs = (ref: string) => {
    notifications
      .filter((x) => x.referenceId === ref && !x.isRead)
      .forEach((x) => markRead.mutate(Number(x.id)));
  };

  const handleAccept = async (n: AppNotification) => {
    if (!n.referenceId || actionedRefs.has(n.referenceId) || loadingRef) return;

    setLoadingRef(n.referenceId);
    // Optimistically hide buttons on ALL cards sharing this referenceId
    setActionedRefs((prev) => new Set(prev).add(n.referenceId!));

    try {
      if (n.referenceType === 'BOOKING_GROUP') {
        await acceptGroup.mutateAsync(n.referenceId);
      } else {
        await acceptBooking.mutateAsync(Number(n.referenceId));
      }
      markAllSiblingNotifs(n.referenceId);
    } catch {
      // Revert optimistic update so the owner can retry
      setActionedRefs((prev) => {
        const next = new Set(prev);
        next.delete(n.referenceId!);
        return next;
      });
      Alert.alert('Error', 'Could not accept — booking may have already been actioned.');
    } finally {
      setLoadingRef(null);
    }
  };

  const handleReject = async (n: AppNotification) => {
    if (!n.referenceId || actionedRefs.has(n.referenceId) || loadingRef) return;

    setLoadingRef(n.referenceId);
    setActionedRefs((prev) => new Set(prev).add(n.referenceId!));

    try {
      if (n.referenceType === 'BOOKING_GROUP') {
        await rejectGroup.mutateAsync(n.referenceId);
      } else {
        await rejectBooking.mutateAsync(Number(n.referenceId));
      }
      markAllSiblingNotifs(n.referenceId);
    } catch {
      setActionedRefs((prev) => {
        const next = new Set(prev);
        next.delete(n.referenceId!);
        return next;
      });
      Alert.alert('Error', 'Could not reject — booking may have already been actioned.');
    } finally {
      setLoadingRef(null);
    }
  };

  const handleView = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(Number(n.id));
    if (n.referenceType === 'BOOKING' && n.referenceId) {
      navigation.navigate('OwnerBookingDetail', { bookingId: n.referenceId });
    } else {
      navigation.navigate('OwnerBookings');
    }
  };

  // Computed once per render; useNow() above ensures re-render every 30 s.
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;
  const nowMins = _now.getHours() * 60 + _now.getMinutes();

  // Show action buttons only when:
  //   • it's an unread "New Booking Request" notification
  //   • not yet actioned this session (in-memory fast path)
  //   • not already read on the server (once accepted/rejected, markAllSiblingNotifs
  //     marks it read so buttons stay gone after the next refetch)
  //   • the booking's slot time has NOT yet passed
  const isActionable = (n: AppNotification) =>
    n.type === 'booking' &&
    !!n.referenceId &&
    n.title === 'New Booking Request' &&
    !n.isRead &&
    !actionedRefs.has(n.referenceId!) &&
    !isNotifSlotPast(n.body, todayStr, nowMins);

  // Unread "New Booking Request" whose slot time has already passed — no action
  // is possible; we show an informational badge instead of Accept / Reject.
  const isExpiredRequest = (n: AppNotification) =>
    n.type === 'booking' &&
    !!n.referenceId &&
    n.title === 'New Booking Request' &&
    !n.isRead &&
    !actionedRefs.has(n.referenceId!) &&
    isNotifSlotPast(n.body, todayStr, nowMins);

  const hasViewLink = (n: AppNotification) => n.type === 'booking' && !!n.referenceId;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
        onBack={() => navigation.goBack()}
        rightLabel={unreadCount > 0 ? 'Mark all read' : undefined}
        onRightPress={unreadCount > 0 ? () => markAllRead.mutate() : undefined}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications" subtitle="You're all caught up!" />
        ) : (
          notifications.map((n) => {
            const actionable = isActionable(n);
            const expired = isExpiredRequest(n);
            const isThisLoading = loadingRef === n.referenceId;

            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.85}
                style={[nfStyles.card, !n.isRead && nfStyles.unread]}
                onPress={() => { if (!n.isRead) markRead.mutate(Number(n.id)); }}
              >
                {/* Header */}
                <View style={nfStyles.headerRow}>
                  <View style={nfStyles.iconCircle}>
                    <Text style={{ fontSize: 18 }}>{NOTIF_ICONS[n.type] ?? '🔔'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={nfStyles.title}>{n.title}</Text>
                    <Text style={nfStyles.time}>{formatRelativeTime(n.date)}</Text>
                  </View>
                  {!n.isRead && <View style={nfStyles.dot} />}
                </View>

                {/* Body */}
                <Text style={nfStyles.body}>{n.body}</Text>

                {/* Inline loading for this card's action */}
                {isThisLoading && (
                  <LoadingOverlay visible={isThisLoading} />
                )}

                {/* Accept / Reject / View — shown only while actionable and not loading */}
                {actionable && !isThisLoading && (
                  <View style={nfStyles.actionsRow}>
                    <TouchableOpacity
                      style={[nfStyles.actionBtn, nfStyles.acceptBtn]}
                      disabled={!!loadingRef}
                      onPress={() => handleAccept(n)}
                    >
                      <Text style={nfStyles.acceptText}>✓ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[nfStyles.actionBtn, nfStyles.rejectBtn]}
                      disabled={!!loadingRef}
                      onPress={() => handleReject(n)}
                    >
                      <Text style={nfStyles.rejectText}>✗ Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[nfStyles.actionBtn, nfStyles.viewBtn]}
                      onPress={() => handleView(n)}
                    >
                      <Text style={nfStyles.viewText}>View →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Expired-slot banner — slot time has passed; no action needed */}
                {expired && !isThisLoading && (
                  <View style={nfStyles.expiredBanner}>
                    <Text style={nfStyles.expiredLabel}>⏰ Slot time has already passed</Text>
                    <Text style={nfStyles.expiredSub}>
                      This request has expired — you can no longer accept or reject it.
                    </Text>
                    <TouchableOpacity style={{ marginTop: spacing.xs }} onPress={() => handleView(n)}>
                      <Text style={nfStyles.viewText}>View Booking →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* View-only link for non-actionable, non-expired booking notifications */}
                {!actionable && !expired && hasViewLink(n) && !isThisLoading && (
                  <TouchableOpacity style={{ marginTop: spacing.sm }} onPress={() => handleView(n)}>
                    <Text style={nfStyles.viewText}>View Booking →</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const nfStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  time: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  body: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20, marginBottom: spacing.xs },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: colors.success, flex: 1 },
  rejectBtn: { backgroundColor: '#ef4444', flex: 1 },
  viewBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
  acceptText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#fff' },
  rejectText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#fff' },
  viewText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  expiredBanner: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  expiredLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#92400e' },
  expiredSub: { fontSize: fontSize.xs, color: '#b45309', marginTop: 2, lineHeight: 16 },
});

/* ───────────────── OwnerSettingsScreen ───────────────── */
export function OwnerSettingsScreen({ navigation }: any) {
  const { data: settings, isLoading } = useOwnerSettings();
  const updateSettings = useUpdateOwnerSettings();

  const autoAccept = settings?.autoAcceptBookings ?? false;
  const push = settings?.pushNotificationsEnabled ?? true;

  const toggle = (field: 'autoAcceptBookings' | 'pushNotificationsEnabled', current: boolean) => {
    updateSettings.mutate({ [field]: !current });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={styles.sectionTitle}>Bookings</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto-accept bookings</Text>
            <Switch
              value={autoAccept}
              onValueChange={() => toggle('autoAcceptBookings', autoAccept)}
              trackColor={{ true: colors.primary }}
              disabled={updateSettings.isPending}
            />
          </View>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Switch
              value={push}
              onValueChange={() => toggle('pushNotificationsEnabled', push)}
              trackColor={{ true: colors.primary }}
              disabled={updateSettings.isPending}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ───────────────── SubscriptionScreen (Owner: My Plan) ───────────────── */
const SUB_STATUS_META: Record<SubscriptionStatus, { label: string; color: string }> = {
  TRIALING: { label: 'Trial', color: colors.info },
  ACTIVE: { label: 'Active', color: colors.success },
  PAST_DUE: { label: 'Past due', color: colors.warning },
  EXPIRED: { label: 'Expired', color: colors.danger },
  CANCELED: { label: 'Canceled', color: colors.textDim },
  VOIDED: { label: 'Voided', color: colors.textDim },
};
const FEATURE_LABELS: Record<string, string> = {
  AUTO_ACCEPT: 'Auto-accept bookings',
  OFFERS: 'Offers & promotions',
  ANALYTICS: 'Analytics',
  ADVANCED_ANALYTICS: 'Advanced analytics',
  PRIORITY_PLACEMENT: 'Priority placement',
  FEATURED_BADGE: 'Featured badge',
  PRIORITY_SUPPORT: 'Priority support',
};
function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SubscriptionScreen({ navigation, route }: any) {
  const ownerVenuesQ = useOwnerVenues();
  const venues = ownerVenuesQ.data?.venues ?? [];
  const paramVenueId = route?.params?.venueId != null ? String(route.params.venueId) : undefined;
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>(paramVenueId);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!selectedVenueId && venues.length) setSelectedVenueId(venues[0].id);
  }, [venues, selectedVenueId]);

  // Honor a venueId passed in via navigation (e.g. tapping a venue's plan badge) even when the
  // screen is already mounted, so each badge lands on its own venue's subscription.
  useEffect(() => {
    if (paramVenueId) setSelectedVenueId(paramVenueId);
  }, [paramVenueId]);

  const subQ = useOwnerVenueSubscription(selectedVenueId);
  const plansQ = useOwnerPlans();
  const upgradeMut = useCreateUpgradeRequest(Number(selectedVenueId));
  const view = subQ.data;
  const current = view?.current ?? null;
  const selectedVenue = venues.find((v) => v.id === selectedVenueId) ?? null;

  useEffect(() => {
    const st = current?.status;
    if (st === 'PAST_DUE' || st === 'EXPIRED') {
      toast.warning('Your subscription has lapsed — renew to go live again.');
    }
  }, [current?.status]);

  const submitUpgrade = (plan: SubscriptionPlan, cycle: 'MONTHLY' | 'ANNUAL') => {
    upgradeMut.mutate(
      { requestedPlanId: Number(plan.id), billingCycle: cycle },
      {
        onSuccess: () => {
          toast.success('Upgrade request submitted. An admin will activate it.');
          setShowUpgrade(false);
        },
        onError: (e) => toast.error(extractApiError(e) || 'Could not submit request'),
      },
    );
  };

  const meta = current ? SUB_STATUS_META[current.status] : null;
  const pending = view?.pendingChangeRequest ?? null;
  const lapsed = current?.status === 'PAST_DUE' || current?.status === 'EXPIRED';

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Subscription / My Plan" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {/* Per-venue context: each venue has its own plan. Show the venue name always, and a
            switcher when the owner has more than one. */}
        {venues.length > 1 && (
          <>
            <Text style={subStyles.selectorLabel}>Select venue ({venues.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
              {venues.map((v) => {
                const active = v.id === selectedVenueId;
                return (
                  <TouchableOpacity key={v.id} onPress={() => setSelectedVenueId(v.id)}
                    style={[subStyles.venueChip, active && subStyles.venueChipActive]}>
                    <Text style={[subStyles.venueChipText, active && { color: colors.white }]} numberOfLines={1}>
                      {v.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}
        {selectedVenue && (
          <Text style={subStyles.venueHeading}>🏟  {selectedVenue.name}</Text>
        )}

        {subQ.isLoading ? (
          <ActivityIndicator color={colors.owner} style={{ marginTop: spacing.xxl }} />
        ) : !selectedVenueId ? (
          <EmptyState title="No venues yet" subtitle="Add a venue to manage its subscription." />
        ) : (
          <>
            {lapsed && (
              <View style={subStyles.banner}>
                <Text style={subStyles.bannerText}>
                  ⚠️ This venue is hidden from players. Contact the admin to renew and go live again.
                </Text>
              </View>
            )}

            {/* Current plan card */}
            {current ? (
              <View style={[styles.card, shadow.card]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {resolvePlanCode(current.planCode) ?? resolvePlanCode(current.planName) ? (
                    <PlanBadge plan={(resolvePlanCode(current.planCode) ?? resolvePlanCode(current.planName))!} showInfo />
                  ) : (
                    <Text style={styles.planName}>{current.planName}</Text>
                  )}
                  {meta && (
                    <View style={[subStyles.badge, { backgroundColor: meta.color }]}>
                      <Text style={subStyles.badgeText}>{meta.label}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.planPrice}>
                  ₹{current.price} / {current.billingCycle === 'ANNUAL' ? 'year' : 'month'}
                </Text>
                <View style={styles.divider} />
                <DRow label="Period" value={`${fmtDate(current.periodStart)} → ${fmtDate(current.periodEnd)}`} />
                {current.status === 'TRIALING' && <DRow label="Trial ends" value={fmtDate(current.trialEnd)} />}
                <DRow label="Courts used" value={`${view?.courtsUsed ?? 0} / ${view?.courtsAllowed ?? current.maxCourts}`} bold />
                <View style={styles.divider} />
                <Text style={subStyles.subHeading}>Included features</Text>
                {current.features.length === 0
                  ? <Text style={styles.planFeature}>Baseline: go live, manual accept/reject, reviews, basic earnings</Text>
                  : current.features.map((f) => (
                      <Text key={f} style={styles.planFeature}>✓ {FEATURE_LABELS[f] ?? f}</Text>
                    ))}
              </View>
            ) : (
              <EmptyState title="No active subscription"
                subtitle="This venue is not live. An admin needs to activate a plan." />
            )}

            {/* Pending change request */}
            {pending && (
              <View style={[subStyles.pendingBox]}>
                <Text style={subStyles.pendingTitle}>Pending plan change</Text>
                {resolvePlanCode(pending.requestedPlanCode) ? (
                  <PlanComparison
                    current={resolvePlanCode(pending.currentPlanName ?? current?.planName)}
                    requested={resolvePlanCode(pending.requestedPlanCode)!}
                    showInfo
                  />
                ) : null}
                <Text style={[subStyles.pendingText, { marginTop: spacing.sm }]}>
                  {pending.requestedCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} billing — awaiting admin activation.
                </Text>
              </View>
            )}

            {/* Upgrade */}
            {!pending && (
              <AppButton
                label={showUpgrade ? 'Hide plans' : 'Upgrade / change plan'}
                variant={showUpgrade ? 'secondary' : 'primary'}
                onPress={() => setShowUpgrade((s) => !s)}
                style={{ marginTop: spacing.lg }}
              />
            )}

            {showUpgrade && !pending && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.sectionTitle}>Choose a plan</Text>
                {(plansQ.data ?? [])
                  .filter((p) => !current || p.id !== current.planId)
                  .map((p) => (
                    <View key={p.id} style={[styles.planCard, shadow.card]}>
                      {resolvePlanCode(p.code) ? (
                        <PlanBadge plan={resolvePlanCode(p.code)!} showInfo />
                      ) : (
                        <Text style={styles.planName}>{p.name}</Text>
                      )}
                      <Text style={styles.planPrice}>₹{p.priceMonthly}/mo · ₹{p.priceAnnual}/yr</Text>
                      <Text style={styles.planFeature}>Up to {p.maxCourts} courts · {p.photoLimit} photos</Text>
                      {p.features.map((f) => (
                        <Text key={f} style={styles.planFeature}>✓ {FEATURE_LABELS[f] ?? f}</Text>
                      ))}
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <AppButton label="Monthly" variant="secondary" style={{ flex: 1 }}
                          onPress={() => submitUpgrade(p, 'MONTHLY')} disabled={upgradeMut.isPending} />
                        <AppButton label="Annual" variant="primary" style={{ flex: 1 }}
                          onPress={() => submitUpgrade(p, 'ANNUAL')} disabled={upgradeMut.isPending} />
                      </View>
                    </View>
                  ))}
              </View>
            )}

            {/* History */}
            {view && view.history.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>History</Text>
                {view.history.map((h) => {
                  const m = SUB_STATUS_META[h.status];
                  const hCode = resolvePlanCode(h.planCode) ?? resolvePlanCode(h.planName);
                  return (
                    <View key={h.id} style={[styles.reviewCard]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        {hCode ? <PlanBadge plan={hCode} size="sm" /> : <Text style={styles.reviewName}>{h.planName}</Text>}
                        <Text style={{ color: m.color, fontWeight: fontWeight.semibold, fontSize: fontSize.xs }}>
                          {m.label}
                        </Text>
                      </View>
                      <Text style={styles.reviewText}>
                        {fmtDate(h.periodStart)} → {fmtDate(h.periodEnd)} · ₹{h.price}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const subStyles = StyleSheet.create({
  selectorLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  venueHeading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  venueChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, maxWidth: 200 },
  venueChipActive: { backgroundColor: colors.owner, borderColor: colors.owner },
  venueChipText: { fontSize: fontSize.sm, color: colors.text },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  subHeading: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMid, marginBottom: spacing.xs },
  banner: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warning },
  bannerText: { color: '#92400E', fontSize: fontSize.sm, lineHeight: 20 },
  pendingBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.primary },
  pendingTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primaryDark },
  pendingText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
});

/* ───────────────── Shared helpers ───────────────── */
function DRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.dRow}>
      <Text style={styles.dLabel}>{label}</Text>
      <Text style={[styles.dValue, bold && { fontWeight: fontWeight.bold, color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  bId: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dLabel: { fontSize: fontSize.sm, color: colors.textMid },
  dValue: { fontSize: fontSize.sm, color: colors.text },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  earnCard: { backgroundColor: colors.owner, borderRadius: radius.lg, padding: spacing.xl },
  earnLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  earnAmount: { fontSize: 38, fontWeight: fontWeight.bold, color: colors.white },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  earnSubVal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
  earnSubLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)' },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  payoutAmount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  payoutMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  infoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  infoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  reviewName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  reviewText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm },
  replyBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
  replyLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMid },
  replyText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  oAvatarWrapper: { position: 'relative' },
  oPencilBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.owner, alignItems: 'center', justifyContent: 'center' },
  oPencilIcon: { fontSize: 11 },
  profileName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  profileEmail: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  oSectionHeader: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.xs, marginLeft: spacing.xs },
  oMenuSection: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  planName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  planPrice: { fontSize: fontSize.lg, color: colors.primary, fontWeight: fontWeight.semibold, marginTop: 4 },
  planFeature: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  bmsRefreshBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: 8, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  bmsRefreshLabel: { fontSize: fontSize.xs, color: colors.textDim },
  bmsRefreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  bmsRefreshIcon: { fontSize: 14, color: colors.primary },
  bmsRefreshText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },
  notifRow: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  notifUnread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  notifTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  notifBody: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },

  // ── EditVenueScreen helpers ──────────────────────────────────────────────
  eFieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  eFieldError: { fontSize: fontSize.xs, color: '#e53935', marginTop: -spacing.sm, marginBottom: spacing.sm },
  eHourChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  eHourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  eHourChipText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },
  eChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  eChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  eChipText: { fontSize: fontSize.sm, color: colors.textMid },
  eWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  eSectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  eHoursPreview: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm, alignItems: 'center' },
  eHoursPreviewText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },
  eInfoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  eInfoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
});
