import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Linking, Alert, RefreshControl,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, StarRating, EmptyState, Toast } from '../../components/common';
import { VenueImageCarousel } from '../../components/venue';
import { VenueMap } from '../../components/venue/VenueMap';
import { RatingDetailModal, ConfirmActionModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useVenueReviews } from '../../api/hooks/useReviews';
import { useSports } from '../../api/hooks/useSports';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { haversineKm, formatDistance } from '../../utils/locationUtils';
import { useAuth } from '../../store/AuthContext';
import { setPendingNav } from '../../store/pendingNav';

const AMENITY_ICON: Record<string, string> = {
  'Locker Room': '🔒',
  'Floodlights': '💡',
  'Drinking Water': '💧',
  'Washroom': '🚿',
  'Shower': '🚿',
  'Parking': '🅿️',
  'Cafeteria': '🍽️',
  'First Aid': '⛑️',
  'WiFi': '📶',
  'Changing Room': '👕',
  'Scoreboard': '📊',
  'Referee': '🦺',
  'Equipment Rental': '🎒',
  'CCTV': '📹',
  'AC': '❄️',
  'Gym': '🏋️',
  'Swimming Pool': '🏊',
  'Spectator Seating': '🪑',
  'Turf': '🌿',
  'Ball': '⚽',
};

function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

function buildFullAddress(address: string, city: string, state: string, pincode: string): string {
  const parts = [
    address,
    city,
    state && pincode ? `${state} ${pincode}` : state || pincode,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function VenueDetailScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { isLoggedIn, role } = useAuth();
  const [showRating, setShowRating] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?._successToast) setSuccessToast(route.params._successToast as string);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: venue, isLoading, isError, refetch: refetchVenue } = useVenueDetail(venueId);
  const { data: reviewsData, refetch: refetchReviews } = useVenueReviews(venueId);
  const { data: sports = [] } = useSports();
  const userLocation = useCurrentLocation();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([refetchVenue(), refetchReviews()]); } finally { setRefreshing(false); }
  };

  const reviews = reviewsData?.reviews ?? [];

  const getSportLabel = (sportId: string) => {
    const s = sports.find((sp) => sp.id === sportId);
    return s ? `${s.icon} ${s.name}` : sportId;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (isError || !venue) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <EmptyState icon="⚠️" title="Venue not found" subtitle="It may have been removed or is unavailable" />
      </SafeAreaView>
    );
  }

  const handleBookNow = () => {
    if (isLoggedIn) {
      if (role !== 'player') {
        Alert.alert(
          'Player Account Required',
          'You are logged in as a Venue Owner. Please use a Player account to book a slot.',
          [{ text: 'OK' }],
        );
        return;
      }
      navigation.navigate('SlotSelection', { venueId: venue.id });
      return;
    }
    setShowLoginPrompt(true);
  };

  const fullAddress = buildFullAddress(venue.address, venue.city, venue.state, venue.pincode);
  const hoursLabel = `${fmt12h(venue.openTime)} – ${fmt12h(venue.closeTime)}`;
  const distLabel =
    userLocation && venue.lat && venue.lng && venue.lat !== 0
      ? formatDistance(haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng))
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={venue.name} onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Hero Carousel */}
        <VenueImageCarousel images={venue.images ?? []} />

        <View style={styles.body}>

          {/* Name + Status */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{venue.name}</Text>
            {venue.status === 'live' && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>● LIVE</Text>
              </View>
            )}
          </View>

          {/* Address + Distance */}
          <Text style={styles.addr}>
            📍 {fullAddress}{distLabel ? `  ·  ${distLabel}` : ''}
          </Text>

          {/* Rating */}
          <TouchableOpacity style={styles.ratingRow} onPress={() => setShowRating(true)}>
            <StarRating value={Math.round(venue.rating)} size={16} />
            <Text style={styles.ratingText}>
              {venue.rating > 0
                ? `${venue.rating.toFixed(1)} · ${venue.reviewCount} review${venue.reviewCount !== 1 ? 's' : ''} ›`
                : 'No ratings yet'}
            </Text>
          </TouchableOpacity>

          {/* Sports */}
          {venue.sports.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Sports Available</Text>
              <View style={styles.chipWrap}>
                {venue.sports.map((s) => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText}>{getSportLabel(s)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Courts */}
          <Text style={styles.sectionTitle}>Courts</Text>
          {venue.courts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No courts have been added yet</Text>
            </View>
          ) : (
            venue.courts.map((c) => (
              <View key={c.id} style={[styles.courtCard, shadow.card]}>
                <View style={styles.courtHeader}>
                  <Text style={styles.courtName}>{c.name}</Text>
                  <Text style={styles.courtPrice}>₹{c.effectivePricePerHour}/hr</Text>
                </View>
                <Text style={styles.courtMeta}>
                  {c.type ? `${c.type}  ·  ` : ''}{fmt12h(c.effectiveOpenTime)} – {fmt12h(c.effectiveCloseTime)}
                </Text>
              </View>
            ))
          )}

          {/* About */}
          {!!venue.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.desc}>{venue.description}</Text>
            </>
          )}

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenityGrid}>
                {venue.amenities.map((a) => (
                  <View key={a} style={styles.amenityItem}>
                    <Text style={styles.amenityIcon}>{AMENITY_ICON[a] ?? '✓'}</Text>
                    <Text style={styles.amenityText} numberOfLines={2}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Info Card: Hours / Phone / Email */}
          <View style={[styles.infoCard, shadow.card]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Operating Hours</Text>
                <Text style={styles.infoValue}>{hoursLabel}</Text>
              </View>
            </View>

            {!!venue.contactPhone && (
              <>
                <View style={styles.infoDivider} />
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`tel:${venue.contactPhone}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.infoIcon}>📞</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={[styles.infoValue, styles.infoLink]}>{venue.contactPhone}</Text>
                  </View>
                  <Text style={styles.infoChevron}>›</Text>
                </TouchableOpacity>
              </>
            )}

            {!!venue.contactEmail && (
              <>
                <View style={styles.infoDivider} />
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => Linking.openURL(`mailto:${venue.contactEmail}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.infoIcon}>✉️</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={[styles.infoValue, styles.infoLink]}>{venue.contactEmail}</Text>
                  </View>
                  <Text style={styles.infoChevron}>›</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Location */}
          <Text style={styles.sectionTitle}>Location</Text>
          <VenueMap
            lat={venue.lat ?? 0}
            lng={venue.lng ?? 0}
            name={venue.name}
            fullAddress={fullAddress}
          />

          {/* Reviews */}
          <Text style={styles.sectionTitle}>
            Reviews{reviews.length > 0 ? ` (${reviews.length})` : ''}
          </Text>
          {reviews.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No reviews yet. Be the first to review!</Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, shadow.card]}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{r.playerName}</Text>
                  <StarRating value={r.rating} size={13} />
                </View>
                {!!r.date && <Text style={styles.reviewDate}>{r.date}</Text>}
                <Text style={styles.reviewText}>{r.comment}</Text>
                {r.ownerReply ? (
                  <View style={styles.replyBox}>
                    <Text style={styles.replyLabel}>Owner replied:</Text>
                    <Text style={styles.replyText}>{r.ownerReply}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

        </View>
      </ScrollView>

      {/* Sticky Booking Bar */}
      <View style={[styles.bottomBar, shadow.modal]}>
        <View>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.price}>
            ₹{venue.pricePerHour}
            <Text style={styles.perSlot}>/hr</Text>
          </Text>
        </View>
        <AppButton
          label="Book Now"
          fullWidth={false}
          onPress={handleBookNow}
          style={{ paddingHorizontal: 40 }}
        />
      </View>

      <RatingDetailModal
        visible={showRating}
        rating={venue.rating}
        breakdown={[
          { label: 'Cleanliness', value: 5 },
          { label: 'Ground Quality', value: 5 },
          { label: 'Staff', value: 4 },
          { label: 'Facilities', value: 4 },
        ]}
        onDismiss={() => setShowRating(false)}
      />

      <ConfirmActionModal
        visible={showLoginPrompt}
        title="Login Required"
        message="Login is required as a Player to book a slot. Do you want to continue?"
        confirmLabel="Proceed"
        onDismiss={() => setShowLoginPrompt(false)}
        onConfirm={() => {
          setShowLoginPrompt(false);
          setPendingNav({
            screen: 'VenueDetail',
            params: { venueId: venue.id, _successToast: 'Logged in successfully! Tap Book Now to proceed.' },
          });
          navigation.navigate('Login');
        }}
      />

      <Toast
        visible={!!successToast}
        message={successToast ?? ''}
        type="success"
        onHide={() => setSuccessToast(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    position: 'absolute', top: spacing.lg, left: spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.lg, paddingBottom: 120 },

  // Name + status
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  liveBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  liveBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#15803D' },

  // Address + rating
  addr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  ratingText: { fontSize: fontSize.sm, color: colors.textMid },

  // Info card
  infoCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.xl, overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  infoDivider: { height: 1, backgroundColor: colors.border },
  infoIcon: { fontSize: 20, width: 34, textAlign: 'center' },
  infoContent: { flex: 1, marginLeft: spacing.sm },
  infoLabel: { fontSize: fontSize.xs, color: colors.textDim },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 1 },
  infoLink: { color: colors.primary },
  infoChevron: { fontSize: 20, color: colors.textDim, marginLeft: spacing.sm },

  // Section titles
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },

  // Sports chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  chipText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.semibold },

  // Amenity grid
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityItem: {
    width: '22%', minHeight: 72,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  amenityIcon: { fontSize: 22 },
  amenityText: { fontSize: fontSize.xs, color: colors.textMid, textAlign: 'center' },

  // Description
  desc: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 22 },

  // Empty box
  emptyBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center',
  },
  emptyBoxText: { fontSize: fontSize.sm, color: colors.textDim },

  // Courts
  courtCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courtName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  courtPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  courtMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },


  // Reviews
  reviewCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  reviewDate: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  reviewText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm, lineHeight: 20 },
  replyBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
    padding: spacing.md, marginTop: spacing.sm,
  },
  replyLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMid },
  replyText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },

  // Bottom booking bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  priceLabel: { fontSize: fontSize.xs, color: colors.textDim },
  price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  perSlot: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.regular },
});
