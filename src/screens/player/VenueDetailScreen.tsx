import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Linking, Alert, RefreshControl, Share, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, EmptyState, LoadingOverlay } from '../../components/common';
import { toast } from '../../toast';
import { VenueImageCarousel } from '../../components/venue';
import { VenueMap } from '../../components/venue/VenueMap';
import { ConfirmActionModal } from '../../modals';
import { RatingSummary, ReviewCard, ReviewsEmptyState, WriteReviewSheet } from '../../components/reviews';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useVenueReviews } from '../../api/hooks/useReviews';
import { useSports } from '../../api/hooks/useSports';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { haversineKm, formatDistance } from '../../utils/locationUtils';
import { formatVenueAddress, getOpenStatus, getMapsUrl } from '../../utils/venueUtils';
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

export default function VenueDetailScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { isLoggedIn, role } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);

  useEffect(() => {
    if (route.params?._successToast) toast.success(route.params._successToast as string);
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
        <LoadingOverlay visible={isLoading} />
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

  const fullAddress = formatVenueAddress(venue.address, venue.city, venue.state, venue.pincode);
  const hoursLabel = `${fmt12h(venue.openTime)} – ${fmt12h(venue.closeTime)}`;
  const distLabel =
    userLocation && venue.lat && venue.lng && venue.lat !== 0
      ? formatDistance(haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng))
      : null;
  const openStatus = getOpenStatus(venue.openTime, venue.closeTime);

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

  const handleCourtTap = (courtId: string, sportId: string) => {
    if (isLoggedIn) {
      if (role !== 'player') {
        Alert.alert('Player Account Required', 'Use a Player account to book.', [{ text: 'OK' }]);
        return;
      }
      navigation.navigate('SlotSelection', { venueId: venue.id, courtId, sportId });
      return;
    }
    setShowLoginPrompt(true);
  };

  const handleShare = async () => {
    const deepLink = `scoreadda://venue/${venue.id}`;
    const playStore = `https://play.google.com/store/apps/details?id=com.turfbook.app`;
    const shareText = [
      `Check out ${venue.name} on Score-Adda! ⚽`,
      `📍 ${fullAddress}`,
      `Starting ₹${venue.pricePerHour}/hr`,
      ``,
      `📲 Open in Score-Adda: ${deepLink}`,
      ``,
      `Don't have the app? Download here: ${playStore}`,
    ].join('\n');

    if (Platform.OS === 'web') {
      // 1. Web Share API — works on mobile Chrome over HTTPS (production)
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: `${venue.name} – Score-Adda`, text: shareText });
          return;
        } catch { /* cancelled or not secure context — fall through */ }
      }
      // 2. Clipboard API — works on HTTPS
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Copied to clipboard!');
          return;
        } catch { /* fall through */ }
      }
      // 3. execCommand fallback — works on plain HTTP (dev environment)
      try {
        const el = document.createElement('textarea');
        el.value = shareText;
        el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Copied to clipboard!');
      } catch { /* nothing worked */ }
      return;
    }

    try {
      await Share.share({ title: `${venue.name} – Score-Adda`, message: shareText });
    } catch {
      // user cancelled — no-op
    }
  };

  const handleDirections = () => {
    const url = getMapsUrl(venue.lat ?? 0, venue.lng ?? 0, venue.name, fullAddress);
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={venue.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Hero Carousel */}
        <VenueImageCarousel images={venue.images ?? []} />

        <View style={styles.body}>

          {/* Name + Open/Closed badge */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{venue.name}</Text>
            <View style={[styles.openBadge, openStatus.isOpen ? styles.openBadgeOpen : styles.openBadgeClosed]}>
              <Text style={[styles.openBadgeText, openStatus.isOpen ? styles.openBadgeTextOpen : styles.openBadgeTextClosed]}>
                {openStatus.isOpen ? '● Open' : '○ Closed'}
              </Text>
            </View>
          </View>

          {/* Tappable address → directions + Share button */}
          <View style={styles.addrRow}>
            <TouchableOpacity onPress={handleDirections} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={[styles.addr, styles.addrLink]} numberOfLines={2}>
                📍 {fullAddress}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={styles.shareIconBtn}>
              <Feather name="share-2" size={16} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          {/* Quick-facts strip */}
          <View style={styles.factsStrip}>
            <RatingSummary
              ratingAverage={venue.ratingAverage}
              ratingCount={venue.ratingCount}
              variant="compact"
              onPress={() => navigation.navigate('VenueReviews', { venueId: venue.id })}
            />
            {distLabel && (
              <>
                <Text style={styles.factsDot}>·</Text>
                <Text style={styles.factsItem}>📍 {distLabel}</Text>
              </>
            )}
            <Text style={styles.factsDot}>·</Text>
            <Text style={[styles.factsItem, openStatus.isOpen ? styles.factsOpen : styles.factsClosed]}>
              {openStatus.label}
            </Text>
            <Text style={styles.factsDot}>·</Text>
            <Text style={styles.factsItem}>₹{venue.pricePerHour}/hr</Text>
          </View>

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

          {/* Courts — tappable, go straight to slot selection */}
          <Text style={styles.sectionTitle}>Courts</Text>
          {venue.courts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No courts have been added yet</Text>
            </View>
          ) : (
            venue.courts.map((c) => {
              const sportLabel = getSportLabel(c.sportId);
              // Only show court hours if they differ from venue hours
              const courtHoursDiffer =
                c.effectiveOpenTime !== venue.openTime ||
                c.effectiveCloseTime !== venue.closeTime;
              const metaParts: string[] = [];
              if (sportLabel) metaParts.push(sportLabel);
              if (c.type) metaParts.push(c.type);
              if (courtHoursDiffer) metaParts.push(`${fmt12h(c.effectiveOpenTime)} – ${fmt12h(c.effectiveCloseTime)}`);

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.courtCard, shadow.card]}
                  onPress={() => handleCourtTap(c.id, c.sportId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.courtHeader}>
                    <Text style={styles.courtName}>{c.name}</Text>
                    <View style={styles.courtRight}>
                      <Text style={styles.courtPrice}>₹{c.effectivePricePerHour}/hr</Text>
                      <Text style={styles.courtChevron}>›</Text>
                    </View>
                  </View>
                  {metaParts.length > 0 && (
                    <Text style={styles.courtMeta}>{metaParts.join('  ·  ')}</Text>
                  )}
                  <Text style={styles.courtCta}>Tap to view & book slots</Text>
                </TouchableOpacity>
              );
            })
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

          {/* Info Card: Hours / Phone */}
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

            <View style={styles.infoDivider} />
            <TouchableOpacity style={styles.infoRow} onPress={handleDirections} activeOpacity={0.7}>
              <Text style={styles.infoIcon}>🗺️</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Directions</Text>
                <Text style={[styles.infoValue, styles.infoLink]} numberOfLines={1}>{fullAddress}</Text>
              </View>
              <Text style={styles.infoChevron}>›</Text>
            </TouchableOpacity>
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
          <View style={styles.reviewsSectionHeader}>
            <Text style={styles.sectionTitle}>
              Reviews{venue.ratingCount > 0 ? ` (${venue.ratingCount})` : ''}
            </Text>
            {isLoggedIn && role === 'player' ? (
              <TouchableOpacity onPress={() => setWriteReviewOpen(true)} activeOpacity={0.7}>
                <Text style={styles.writeReviewLink}>
                  {reviews.some((r) => r.isOwn) ? 'Edit your review' : 'Write a review'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {reviews.length === 0 ? (
            <ReviewsEmptyState
              ctaLabel={isLoggedIn && role === 'player' ? 'Write a review' : undefined}
              onCtaPress={isLoggedIn && role === 'player' ? () => setWriteReviewOpen(true) : undefined}
            />
          ) : (
            <>
              {reviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} />)}
              {venue.ratingCount > 3 ? (
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('VenueReviews', { venueId: venue.id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See all {venue.ratingCount} reviews ›</Text>
                </TouchableOpacity>
              ) : null}
            </>
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

      <WriteReviewSheet
        venueId={Number(venue.id)}
        visible={writeReviewOpen}
        onClose={() => setWriteReviewOpen(false)}
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

  // Name + badge
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  openBadge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  openBadgeOpen: { backgroundColor: '#DCFCE7' },
  openBadgeClosed: { backgroundColor: '#FEE2E2' },
  openBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  openBadgeTextOpen: { color: '#15803D' },
  openBadgeTextClosed: { color: '#B91C1C' },

  // Address + Share row
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  addr: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
  addrLink: { color: colors.primary },
  shareIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  // Quick-facts strip
  factsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  factsDot: { fontSize: fontSize.xs, color: colors.textDim },
  factsItem: { fontSize: fontSize.xs, color: colors.textMid },
  factsOpen: { color: '#15803D', fontWeight: fontWeight.semibold },
  factsClosed: { color: '#B91C1C', fontWeight: fontWeight.semibold },

  // Section titles
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },

  // Sports chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  chipText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.semibold },

  // Courts
  courtCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courtName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  courtRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  courtPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  courtChevron: { fontSize: 20, color: colors.textDim },
  courtMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  courtCta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 6 },

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

  // Reviews
  reviewsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  writeReviewLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  seeAllBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  seeAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

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
