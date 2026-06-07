import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import {
  AppHeader, AppButton, AppInput, SectionTabBar,
  StatusBadge, StarRating, EmptyState, SportChip, HourPickerDropdown, AvatarImage,
} from '../../components/common';
import { BookingCard, VenueImagePicker, PickedImage } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { useBookings, useBookingDetail, useAcceptBooking, useRejectBooking } from '../../api/hooks/useBookings';
import { useOwnerSettings, useUpdateOwnerSettings } from '../../api/hooks/useSettings';
import { useOwnerStats } from '../../api/hooks/useAdmin';
import { useOwnerPayouts } from '../../api/hooks/usePayouts';
import { useOwnerReviews } from '../../api/hooks/useReviews';
import { useVenueDetail, useUpdateVenue, useUploadVenueImage } from '../../api/hooks/useVenues';
import { useSports } from '../../api/hooks/useSports';
import { useNotifications } from '../../api/hooks/useNotifications';
import { useMe } from '../../api/hooks/useUser';
import { extractApiError } from '../../api/client';
import { parseLatLng, formatLatLng } from '../../utils/locationUtils';

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
export function BookingManagementScreen({ navigation }: any) {
  const [tab, setTab] = useState('requests');
  const statusMap: Record<string, string> = {
    requests: 'PENDING',
    today: 'CONFIRMED',
    upcoming: 'CONFIRMED',
    past: 'COMPLETED',
  };
  const { data, isLoading } = useBookings({ status: statusMap[tab] });
  const bookings = data?.bookings ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Bookings" />
      <SectionTabBar
        tabs={[
          { label: 'Requests', value: 'requests' },
          { label: 'Today', value: 'today' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Past', value: 'past' },
        ]}
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
  const [showReject, setShowReject] = useState(false);
  const acceptBooking = useAcceptBooking();
  const rejectBooking = useRejectBooking();

  if (isLoading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Booking Details" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
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
        onConfirm={() => { setShowCheckIn(false); navigation.goBack(); }}
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
  const { data: me } = useMe();

  const displayName   = me?.name   ?? user?.name   ?? '';
  const displayEmail  = me?.email  ?? user?.email  ?? '';
  const displayAvatar = me?.avatar ?? user?.avatar;

  return (
    <SafeAreaView style={styles.container}>
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

        {[
          { icon: '🏟', label: 'My Venues', onPress: () => navigation.navigate('VenuesTab') },
          { icon: '💰', label: 'Bank & Payouts', onPress: () => navigation.navigate('EarningsTab') },
          { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('OwnerNotifications') },
          { icon: '⚙️', label: 'Settings', onPress: () => navigation.navigate('OwnerSettings') },
          { icon: '👤', label: 'Switch to Player', onPress: () => navigation.navigate('RoleChange', { targetRole: 'PLAYER' }), color: colors.primary },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <Text style={[styles.menuLabel, item.color ? { color: item.color } : undefined]}>{item.label}</Text>
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
      setEmail(venue.contactEmail);
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
      <SafeAreaView style={styles.container}>
        <AppHeader title="Edit Venue" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
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
  const { data: settings, isLoading } = useOwnerSettings();
  const updateSettings = useUpdateOwnerSettings();

  const autoAccept = settings?.autoAcceptBookings ?? false;
  const push = settings?.pushNotificationsEnabled ?? true;

  const toggle = (field: 'autoAcceptBookings' | 'pushNotificationsEnabled', current: boolean) => {
    updateSettings.mutate({ [field]: !current });
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
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
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  oAvatarWrapper: { position: 'relative' },
  oPencilBadge: { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.owner, alignItems: 'center', justifyContent: 'center' },
  oPencilIcon: { fontSize: 11 },
  profileName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  profileEmail: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
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
