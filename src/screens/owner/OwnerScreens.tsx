import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import {
  AppHeader, AppButton, AppInput, SectionTabBar,
  StatusBadge, StarRating, EmptyState,
} from '../../components/common';
import { BookingCard } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { useBookings, useBookingDetail } from '../../api/hooks/useBookings';
import { useOwnerStats } from '../../api/hooks/useAdmin';
import { useOwnerPayouts } from '../../api/hooks/usePayouts';
import { useOwnerReviews } from '../../api/hooks/useReviews';
import { useUpdateVenue } from '../../api/hooks/useVenues';
import { useNotifications } from '../../api/hooks/useNotifications';
import { extractApiError } from '../../api/client';

/* ───────────────── BookingManagementScreen ───────────────── */
export function BookingManagementScreen({ navigation }: any) {
  const [tab, setTab] = useState('today');
  const statusMap: Record<string, string> = { today: 'CONFIRMED', upcoming: 'CONFIRMED', past: 'COMPLETED' };
  const { data, isLoading } = useBookings({ status: statusMap[tab] });
  const bookings = data?.bookings ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Bookings" />
      <SectionTabBar
        tabs={[{ label: 'Today', value: 'today' }, { label: 'Upcoming', value: 'upcoming' }, { label: 'Past', value: 'past' }]}
        activeTab={tab}
        onChange={setTab}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : bookings.length === 0 ? (
          <EmptyState icon="📅" title="No bookings" subtitle="" />
        ) : (
          bookings.map((b) => (
            <BookingCard key={b.id} booking={b} viewAs="owner" onPress={() => navigation.navigate('OwnerBookingDetail', { bookingId: b.id })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerBookingDetailScreen ───────────────── */
export function OwnerBookingDetailScreen({ navigation, route }: any) {
  const { data: booking, isLoading } = useBookingDetail(route.params.bookingId);
  const [showCheckIn, setShowCheckIn] = useState(false);

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Booking Details" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        {booking.status === 'confirmed' && (
          <AppButton label="Mark as Checked-In" onPress={() => setShowCheckIn(true)} style={{ marginTop: spacing.xl }} />
        )}
      </ScrollView>
      <ConfirmActionModal
        visible={showCheckIn}
        title="Check-in Player?"
        message={`Confirm that ${booking.playerName} has arrived.`}
        confirmLabel="Check In"
        onConfirm={() => { setShowCheckIn(false); navigation.goBack(); }}
        onDismiss={() => setShowCheckIn(false)}
      />
    </SafeAreaView>
  );
}

/* ───────────────── EarningsScreen ───────────────── */
export function EarningsScreen() {
  const { data: stats } = useOwnerStats();
  const { data } = useOwnerPayouts();
  const payouts = data?.payouts ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Earnings" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
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
export function ReviewsManagementScreen() {
  const { data, isLoading } = useOwnerReviews();
  const reviews = data?.reviews ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reviews" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : reviews.length === 0 ? (
          <EmptyState icon="⭐" title="No reviews yet" subtitle="" />
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.reviewName}>{r.playerName}</Text>
                <StarRating value={r.rating} size={13} />
              </View>
              <Text style={styles.reviewText}>{r.comment}</Text>
              {r.ownerReply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Your reply:</Text>
                  <Text style={styles.replyText}>{r.ownerReply}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerProfileScreen ───────────────── */
export function OwnerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 32 }}>🏟</Text>
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
        {[
          { icon: '🏟', label: 'My Venues', onPress: () => navigation.navigate('VenuesTab') },
          { icon: '💰', label: 'Bank & Payouts', onPress: () => navigation.navigate('EarningsTab') },
          { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('OwnerNotifications') },
          { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('OwnerSettings') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
        <AppButton label="Log Out" variant="danger" onPress={logout} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── EditVenueScreen ───────────────── */
export function EditVenueScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const updateVenue = useUpdateVenue();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateVenue.mutateAsync({
        id: Number(venueId),
        data: { name: name || undefined, description: desc || undefined, pricePerSlot: price ? parseInt(price) : undefined },
      });
      navigation.goBack();
    } catch (err) {
      console.warn(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Edit Venue" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppInput label="Venue Name" value={name} onChangeText={setName} />
        <AppInput label="Description" value={desc} onChangeText={setDesc} multiline />
        <AppInput label="Price per Slot (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <AppButton label={loading ? 'Saving…' : 'Save Changes'} loading={loading} onPress={handleSave} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerNotificationsScreen ───────────────── */
export function OwnerNotificationsScreen({ navigation }: any) {
  const { data, isLoading } = useNotifications();
  const notifications = data?.notifications ?? [];
  const ICONS: Record<string, string> = { booking: '✅', payment: '💰', offer: '🎉', review: '⭐', system: '🔔' };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications" subtitle="" />
        ) : (
          notifications.map((n) => (
            <View key={n.id} style={[styles.notifRow, !n.isRead && styles.notifUnread]}>
              <Text style={{ fontSize: 20 }}>{ICONS[n.type] ?? '🔔'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifBody}>{n.body}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerSettingsScreen ───────────────── */
export function OwnerSettingsScreen({ navigation }: any) {
  const [autoAccept, setAutoAccept] = useState(false);
  const [push, setPush] = useState(true);
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.sectionTitle}>Bookings</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Auto-accept bookings</Text>
          <Switch value={autoAccept} onValueChange={setAutoAccept} trackColor={{ true: colors.primary }} />
        </View>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notifications</Text>
          <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.primary }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── SubscriptionScreen ───────────────── */
export function SubscriptionScreen({ navigation }: any) {
  const plans = [
    { name: 'Free', price: '₹0/mo', features: ['Up to 1 venue', 'Basic analytics'] },
    { name: 'Pro', price: '₹999/mo', features: ['Up to 5 venues', 'Priority listing', 'Advanced analytics'] },
    { name: 'Premium', price: '₹1999/mo', features: ['Unlimited venues', 'Top listing', '24/7 support'] },
  ];
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Subscription" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {plans.map((p) => (
          <View key={p.name} style={[styles.planCard, shadow.card]}>
            <Text style={styles.planName}>{p.name}</Text>
            <Text style={styles.planPrice}>{p.price}</Text>
            {p.features.map((f) => <Text key={f} style={styles.planFeature}>✓ {f}</Text>)}
            <AppButton label="Select Plan" variant="secondary" onPress={() => {}} style={{ marginTop: spacing.md }} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

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
  profileCard: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  profileName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  profileEmail: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  planName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  planPrice: { fontSize: fontSize.lg, color: colors.primary, fontWeight: fontWeight.semibold, marginTop: 4 },
  planFeature: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  notifRow: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  notifUnread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  notifTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  notifBody: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
});
