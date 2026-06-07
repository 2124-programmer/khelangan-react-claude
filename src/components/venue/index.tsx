// Venue and booking related reusable components.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { haversineKm, formatDistance } from '../../utils/locationUtils';
import type { LatLng } from '../../store/LocationContext';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { Venue, Slot, Booking } from '../../types';
import { StatusBadge, AppButton } from '../common';
import { getSportIcon } from '../../utils/sportUtils';

export { VenueImagePicker } from './VenueImagePicker';
export type { PickedImage } from './VenueImagePicker';
export { VenueImageCarousel } from './VenueImageCarousel';

/* ───────────────── VenueCard helpers ───────────────── */

function RatingBadge({ rating }: { rating: number }) {
  return (
    <View style={vc.ratingBadge}>
      <Text style={vc.ratingText}>⭐ {rating.toFixed(1)}</Text>
    </View>
  );
}

function MostBookedBadge() {
  return (
    <View style={vc.mostBookedBadge}>
      <Text style={vc.mostBookedText}>🔥 Most Booked</Text>
    </View>
  );
}

function SportIcon({ sportId }: { sportId: string }) {
  return (
    <View style={vc.sportIcon}>
      <Text style={vc.sportIconText}>{getSportIcon(sportId)}</Text>
    </View>
  );
}

function BookNowButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={vc.bookNowBtn} onPress={onPress} activeOpacity={0.82}>
      <Text style={vc.bookNowText}>Book Now</Text>
    </TouchableOpacity>
  );
}

/* ───────────────── VenueCard ───────────────── */
interface VenueCardProps {
  venue: Venue;
  onPress: () => void;
  userLocation?: LatLng;
}

export function VenueCard({ venue, onPress, userLocation }: VenueCardProps) {
  const coverUri =
    venue.images?.find((i) => i.isPrimary)?.url ??
    venue.images?.[0]?.url ??
    venue.coverPhoto;

  const distanceLabel = useMemo(() => {
    if (userLocation && venue.lat && venue.lng) {
      return formatDistance(haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng));
    }
    if (venue.distanceKm > 0) return `${venue.distanceKm} km away`;
    return null;
  }, [userLocation, venue.lat, venue.lng, venue.distanceKm]);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[vc.card, shadow.card]}>

      {/* ── Image ── */}
      <View style={vc.imageWrap}>
        <Image source={{ uri: coverUri }} style={vc.image} resizeMode="cover" />
        <View style={vc.imageOverlay} />
        <View style={vc.imageBadgeRow}>
          <RatingBadge rating={venue.rating} />
          {venue.isMostBooked && <MostBookedBadge />}
        </View>
      </View>

      {/* ── Body ── */}
      <View style={vc.body}>

        <Text style={vc.venueName} numberOfLines={1}>{venue.name}</Text>

        <View style={vc.locationRow}>
          <Text style={vc.venueAddr} numberOfLines={1}>
            📍 {venue.address}
          </Text>
          {distanceLabel && (
            <Text style={vc.distanceText}>{distanceLabel}</Text>
          )}
        </View>

        {venue.sports?.length > 0 && (
          <View style={vc.sportRow}>
            {venue.sports.map((s) => <SportIcon key={s} sportId={s} />)}
          </View>
        )}

        <View style={vc.footer}>
          <View>
            <Text style={vc.priceLabel}>Starting from</Text>
            <Text style={vc.price}>
              ₹{venue.pricePerHour}
              <Text style={vc.priceUnit}>/hr</Text>
            </Text>
          </View>
          <BookNowButton onPress={onPress} />
        </View>

      </View>
    </TouchableOpacity>
  );
}

const vc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  imageBadgeRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  ratingText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  mostBookedBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  mostBookedText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  body: {
    padding: spacing.lg,
  },
  venueName: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  venueAddr: {
    fontSize: fontSize.sm,
    color: colors.textMid,
    flex: 1,
    marginRight: spacing.sm,
  },
  distanceText: {
    fontSize: fontSize.sm,
    color: colors.textMid,
    fontWeight: fontWeight.medium,
  },
  sportRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  sportIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  sportIconText: {
    fontSize: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textDim,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  priceUnit: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    color: colors.textMid,
  },
  bookNowBtn: {
    backgroundColor: '#6BCB2C',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  bookNowText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

/* ───────────────── SlotGrid ───────────────── */
interface SlotGridProps {
  slots: Slot[];
  selectedIds?: Set<string>;
  onSelect?: (slot: Slot) => void;
  mode?: 'player' | 'owner';
}
export function SlotGrid({ slots, selectedIds, onSelect, mode = 'player' }: SlotGridProps) {
  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.slotAvailable} label="Available" />
        <Legend color={colors.slotBooked} label="Booked" />
        <Legend color={colors.slotBlocked} label="Blocked" />
      </View>
      <View style={styles.slotGrid}>
        {slots.map((slot) => {
          const isSelected = selectedIds?.has(slot.id) ?? false;
          const disabled = slot.status !== 'available' || mode === 'owner';
          const bg =
            isSelected ? colors.slotSelected
            : slot.status === 'available' ? colors.primaryLight
            : slot.status === 'booked' ? '#FEE2E2'
            : colors.surfaceAlt;
          const fg =
            isSelected ? colors.white
            : slot.status === 'available' ? colors.primaryDark
            : slot.status === 'booked' ? '#B91C1C'
            : colors.textDim;
          return (
            <TouchableOpacity
              key={slot.id}
              disabled={mode === 'player' && disabled}
              onPress={() => onSelect?.(slot)}
              style={[styles.slot, { backgroundColor: bg }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.slotTime, { color: fg }]}>{slot.startTime}</Text>
              <Text style={[styles.slotPrice, { color: fg }]}>₹{slot.price}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/* ───────────────── BookingCard ───────────────── */
interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  onRebook?: () => void;
  viewAs?: 'player' | 'owner';
}
export function BookingCard({ booking, onPress, onCancel, onReview, onRebook, viewAs = 'player' }: BookingCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.bookingCard, shadow.card]}>
      <View style={{ flexDirection: 'row' }}>
        <Image source={{ uri: booking.venuePhoto }} style={styles.bookingImg} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.bookingVenue} numberOfLines={1}>{booking.venueName}</Text>
            <StatusBadge status={booking.status} />
          </View>
          <Text style={styles.bookingMeta}>{getSportIcon('s1')} {booking.sport} · {booking.courtName}</Text>
          <Text style={styles.bookingMeta}>📅 {booking.date} · {booking.startTime}–{booking.endTime}</Text>
          {viewAs === 'owner' && <Text style={styles.bookingMeta}>👤 {booking.playerName}</Text>}
          <Text style={styles.bookingAmount}>₹{booking.amount}</Text>
        </View>
      </View>
      {(onCancel || onReview || onRebook) && (
        <View style={styles.actionRow}>
          {booking.status === 'confirmed' && onCancel && (
            <AppButton label="Cancel" variant="danger" fullWidth={false} onPress={onCancel} style={{ flex: 1, height: 40 }} />
          )}
          {booking.status === 'completed' && !booking.hasReview && onReview && (
            <AppButton label="Rate & Review" variant="ghost" fullWidth={false} onPress={onReview} style={{ flex: 1, height: 40 }} />
          )}
          {(booking.status === 'completed' || booking.status === 'cancelled') && onRebook && (
            <AppButton label="Rebook" variant="secondary" fullWidth={false} onPress={onRebook} style={{ flex: 1, height: 40 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ───────────────── PriceSummary ───────────────── */
export function PriceSummary({ base, fee, discount, total }: { base: number; fee: number; discount: number; total: number }) {
  return (
    <View style={styles.priceBox}>
      <PriceRow label="Slot price" value={base} />
      <PriceRow label="Convenience fee" value={fee} />
      {discount > 0 && <PriceRow label="Coupon discount" value={-discount} highlight />}
      <View style={styles.divider} />
      <PriceRow label="Total payable" value={total} bold />
    </View>
  );
}
function PriceRow({ label, value, bold, highlight }: { label: string; value: number; bold?: boolean; highlight?: boolean }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, bold && { fontWeight: fontWeight.bold, color: colors.text }]}>{label}</Text>
      <Text style={[
        styles.priceValue,
        bold && { fontWeight: fontWeight.bold, fontSize: fontSize.lg },
        highlight && { color: colors.success },
      ]}>
        {value < 0 ? '-' : ''}₹{Math.abs(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  venueCard: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  venueImg: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceAlt },
  venueBody: { padding: spacing.lg },
  venueName: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  venuePrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.primary },
  perSlot: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.regular },
  venueAddr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4 },
  venueMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  metaText: { fontSize: fontSize.xs, color: colors.textMid },
  sportRow: { flexDirection: 'row', gap: 6, marginTop: spacing.md, flexWrap: 'wrap' },
  miniChip: { backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  legendRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
  legendText: { fontSize: fontSize.xs, color: colors.textMid },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '31%', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  slotTime: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  slotPrice: { fontSize: fontSize.xs, marginTop: 2 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  bookingImg: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  bookingVenue: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  bookingMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 3 },
  bookingAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  priceBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceLabel: { fontSize: fontSize.sm, color: colors.textMid },
  priceValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
