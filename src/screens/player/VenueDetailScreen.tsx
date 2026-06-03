import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, StarRating, EmptyState } from '../../components/common';
import { VenueImageCarousel } from '../../components/venue';
import { RatingDetailModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useVenueReviews } from '../../api/hooks/useReviews';
import { useSports } from '../../api/hooks/useSports';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { haversineKm, formatDistance } from '../../utils/locationUtils';
import { useAuth } from '../../store/AuthContext';

export default function VenueDetailScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { isLoggedIn } = useAuth();
  const [showRating, setShowRating] = useState(false);

  const { data: venue, isLoading, isError } = useVenueDetail(venueId);
  const { data: reviewsData } = useVenueReviews(venueId);
  const { data: sports = [] } = useSports();
  const userLocation = useCurrentLocation();

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

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={venue.name} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <VenueImageCarousel images={venue.images ?? []} />

        <View style={styles.body}>
          <Text style={styles.name}>{venue.name}</Text>
          <Text style={styles.addr}>
            📍 {venue.address}
            {userLocation && venue.lat && venue.lng
              ? `  •  ${formatDistance(haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng))}`
              : ''}
          </Text>
          <TouchableOpacity style={styles.ratingRow} onPress={() => setShowRating(true)}>
            <StarRating value={Math.round(venue.rating)} size={16} />
            <Text style={styles.ratingText}>{venue.rating} · {venue.reviewCount} reviews ›</Text>
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

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.chipWrap}>
                {venue.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>✓ {a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* About */}
          {!!venue.description && (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.desc}>{venue.description}</Text>
            </>
          )}

          {/* Map placeholder */}
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={{ fontSize: 32 }}>🗺️</Text>
            <Text style={styles.mapText}>{venue.address}</Text>
          </View>

          {/* Reviews */}
          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.reviewName}>{r.playerName}</Text>
                <StarRating value={r.rating} size={13} />
              </View>
              <Text style={styles.reviewText}>{r.comment}</Text>
              {r.ownerReply ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Owner replied:</Text>
                  <Text style={styles.replyText}>{r.ownerReply}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Book bar */}
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
          onPress={() => isLoggedIn
            ? navigation.navigate('SlotSelection', { venueId: venue.id })
            : navigation.navigate('Login')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: { position: 'absolute', top: spacing.lg, left: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, paddingBottom: 120 },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  addr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  ratingText: { fontSize: fontSize.sm, color: colors.textMid },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  chipText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.semibold },
  amenityChip: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  amenityText: { fontSize: fontSize.sm, color: colors.textMid },
  desc: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 22 },
  mapPlaceholder: { height: 120, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mapText: { fontSize: fontSize.sm, color: colors.textMid },
  reviewCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  reviewName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  reviewText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm, lineHeight: 20 },
  replyBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.sm },
  replyLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMid },
  replyText: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  priceLabel: { fontSize: fontSize.xs, color: colors.textDim },
  price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  perSlot: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.regular },
});
