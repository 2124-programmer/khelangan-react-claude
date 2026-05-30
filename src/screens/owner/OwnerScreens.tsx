import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Image } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput, SectionTabBar, StatusBadge, StarRating, EmptyState, AvatarImage } from '../../components/common';
import { BookingCard } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { BOOKINGS, VENUES, REVIEWS, PAYOUTS, OWNER_STATS } from '../../data/mockData';

const ownerVenueIds = VENUES.filter((v) => v.ownerId === 'o1').map((v) => v.id);

/* ───────────────── BookingManagementScreen ───────────────── */
export function BookingManagementScreen({ navigation }: any) {
  const [tab, setTab] = useState('today');
  const bookings = BOOKINGS.filter((b) => ownerVenueIds.includes(b.venueId));
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Bookings" />
      <SectionTabBar
        tabs={[{ label: 'Today', value: 'today' }, { label: 'Upcoming', value: 'upcoming' }, { label: 'Past', value: 'past' }]}
        activeTab={tab}
        onChange={setTab}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {bookings.length === 0 ? (
          <EmptyState icon="📅" title="No bookings" />
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
  const booking = BOOKINGS.find((b) => b.id === route.params.bookingId)!;
  const [showCheckIn, setShowCheckIn] = useState(false);
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
      <ConfirmActionModal visible={showCheckIn} title="Check-in Player?" message={`Confirm that ${booking.playerName} has arrived for their slot.`} confirmLabel="Check In" onConfirm={() => { setShowCheckIn(false); navigation.goBack(); }} onDismiss={() => setShowCheckIn(false)} />
    </SafeAreaView>
  );
}

/* ───────────────── EarningsScreen ───────────────── */
export function EarningsScreen() {
  const myPayouts = PAYOUTS.filter((p) => p.ownerId === 'o1');
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Earnings" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.earnCard}>
          <Text style={styles.earnLabel}>Total This Month</Text>
          <Text style={styles.earnAmount}>₹{OWNER_STATS.monthRevenue.toLocaleString('en-IN')}</Text>
          <View style={styles.earnRow}>
            <View><Text style={styles.earnSubVal}>₹{OWNER_STATS.weekRevenue.toLocaleString('en-IN')}</Text><Text style={styles.earnSubLabel}>This Week</Text></View>
            <View><Text style={styles.earnSubVal}>₹{OWNER_STATS.pendingPayout.toLocaleString('en-IN')}</Text><Text style={styles.earnSubLabel}>Pending Payout</Text></View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payout History</Text>
        {myPayouts.map((p) => (
          <View key={p.id} style={styles.payoutRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payoutAmount}>₹{p.netAmount.toLocaleString('en-IN')}</Text>
              <Text style={styles.payoutMeta}>Gross ₹{p.amount.toLocaleString('en-IN')} · {p.date}</Text>
            </View>
            <StatusBadge status={p.status} />
          </View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>💡 Payouts are settled weekly to your registered bank account after deducting the 10% platform commission.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── ReviewsManagementScreen ───────────────── */
export function ReviewsManagementScreen({ navigation }: any) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reviews" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {REVIEWS.map((r) => (
          <View key={r.id} style={[styles.card, shadow.card, { marginBottom: spacing.md }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.reviewName}>{r.playerName}</Text>
              <StarRating value={r.rating} size={14} />
            </View>
            <Text style={styles.reviewText}>{r.comment}</Text>
            {r.ownerReply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Your reply:</Text>
                <Text style={styles.replyText}>{r.ownerReply}</Text>
              </View>
            ) : (
              <AppButton label="Reply" variant="ghost" fullWidth={false} onPress={() => setReplyTo(r.id)} style={{ height: 38, alignSelf: 'flex-start', paddingHorizontal: spacing.lg, marginTop: spacing.sm }} />
            )}
          </View>
        ))}
      </ScrollView>
      <ConfirmActionModal visible={!!replyTo} title="Reply to Review" message="Your reply will be publicly visible under this review." confirmLabel="Post Reply" onConfirm={() => setReplyTo(null)} onDismiss={() => setReplyTo(null)} />
    </SafeAreaView>
  );
}

/* ───────────────── OwnerProfileScreen ───────────────── */
export function OwnerProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const menu = [
    { icon: '🏟', label: 'My Venues', route: 'VenuesTab' },
    { icon: '💳', label: 'Bank & Payouts', route: 'Subscription' },
    { icon: '⭐', label: 'Subscription Plan', route: 'Subscription' },
    { icon: '🔔', label: 'Notifications', route: 'OwnerNotifications' },
    { icon: '⚙️', label: 'Settings', route: 'OwnerSettings' },
  ];
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Profile" />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.profileCard, shadow.card]}>
          <AvatarImage uri={user?.avatar} name={user?.name ?? ''} size={72} />
          <Text style={styles.pName}>{user?.name}</Text>
          <Text style={styles.pEmail}>{user?.email}</Text>
          <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>🏟 Venue Owner</Text></View>
        </View>
        <View style={styles.menu}>
          {menu.map((m) => (
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
      <ConfirmActionModal visible={showLogout} title="Logout?" message="You'll need to login again." confirmLabel="Logout" danger onConfirm={() => { setShowLogout(false); logout(); }} onDismiss={() => setShowLogout(false)} />
    </SafeAreaView>
  );
}

/* ───────────────── EditVenueScreen ───────────────── */
export function EditVenueScreen({ navigation, route }: any) {
  const venue = VENUES.find((v) => v.id === route.params?.venueId) ?? VENUES[0];
  const [name, setName] = useState(venue.name);
  const [desc, setDesc] = useState(venue.description);
  const [price, setPrice] = useState(String(venue.pricePerSlot));
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Edit Venue" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppInput label="Venue Name" value={name} onChangeText={setName} />
        <AppInput label="Description" value={desc} onChangeText={setDesc} multiline />
        <AppInput label="Price per slot (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        <AppButton label="Save Changes" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── SubscriptionScreen ───────────────── */
export function SubscriptionScreen({ navigation }: any) {
  const plans = [
    { name: 'Free', price: '₹0', features: ['Basic listing', '10% commission', 'Standard support'], active: true },
    { name: 'Pro', price: '₹999/mo', features: ['Featured listing', '7% commission', 'Priority support', 'Analytics'], active: false },
    { name: 'Premium', price: '₹2499/mo', features: ['Top placement', '5% commission', '24/7 support', 'Advanced analytics', 'Promo tools'], active: false },
  ];
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Subscription Plans" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {plans.map((p) => (
          <View key={p.name} style={[styles.planCard, p.active && styles.planActive]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.planName}>{p.name}</Text>
              <Text style={styles.planPrice}>{p.price}</Text>
            </View>
            {p.features.map((f) => <Text key={f} style={styles.planFeature}>✓ {f}</Text>)}
            <AppButton label={p.active ? 'Current Plan' : 'Upgrade'} variant={p.active ? 'secondary' : 'primary'} disabled={p.active} onPress={() => {}} style={{ marginTop: spacing.md }} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerNotificationsScreen ───────────────── */
export function OwnerNotificationsScreen({ navigation }: any) {
  const items = [
    { icon: '✅', title: 'New Booking', body: 'Rohan booked Court A for Jun 5, 6 PM', time: '1h ago' },
    { icon: '💰', title: 'Payout Settled', body: '₹10,800 credited to your account', time: '2d ago' },
    { icon: '⭐', title: 'New Review', body: 'Vikram rated Green Turf Arena 5 stars', time: '3d ago' },
  ];
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {items.map((n, i) => (
          <View key={i} style={styles.notifRow}>
            <View style={styles.notifIcon}><Text style={{ fontSize: 20 }}>{n.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              <Text style={styles.notifBody}>{n.body}</Text>
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── OwnerSettingsScreen ───────────────── */
export function OwnerSettingsScreen({ navigation }: any) {
  const [autoAccept, setAutoAccept] = useState(true);
  const [notify, setNotify] = useState(true);
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Auto-accept bookings</Text>
          <Switch value={autoAccept} onValueChange={setAutoAccept} trackColor={{ true: colors.owner }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Booking notifications</Text>
          <Switch value={notify} onValueChange={setNotify} trackColor={{ true: colors.owner }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.dRow}>
      <Text style={styles.dLabel}>{label}</Text>
      <Text style={[styles.dValue, bold && { fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: colors.owner }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  bId: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  dLabel: { fontSize: fontSize.sm, color: colors.textMid },
  dValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  earnCard: { backgroundColor: colors.owner, borderRadius: radius.lg, padding: spacing.xl },
  earnLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  earnAmount: { fontSize: 38, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.xs },
  earnRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  earnSubVal: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
  earnSubLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  payoutRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  payoutAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  payoutMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  infoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  infoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
  reviewName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  reviewText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm, lineHeight: 20 },
  replyBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
  replyLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMid },
  replyText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  pName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  pEmail: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  ownerBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, marginTop: spacing.md },
  ownerBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.owner },
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.lg, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
  planCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.border },
  planActive: { borderColor: colors.owner },
  planName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  planPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.owner },
  planFeature: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm },
  notifRow: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  notifBody: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  notifTime: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
});
