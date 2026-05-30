// Venue and booking related reusable components.
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { Venue, Slot, Booking } from '../../types';
import { StarRating, StatusBadge, AppButton } from '../common';
import { getSportIcon, getSportName } from '../../utils/sportUtils';

/* ───────────────── VenueCard ───────────────── */
export function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.venueCard, shadow.card]}>
      <Image source={{ uri: venue.coverPhoto }} style={styles.venueImg} />
      <View style={styles.venueBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.venuePrice}>₹{venue.pricePerSlot}<Text style={styles.perSlot}>/slot</Text></Text>
        </View>
        <Text style={styles.venueAddr} numberOfLines={1}>📍 {venue.address}</Text>
        <View style={styles.venueMeta}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <StarRating value={Math.round(venue.rating)} size={13} />
            <Text style={styles.metaText}>{venue.rating} ({venue.reviewCount})</Text>
          </View>
          <Text style={styles.metaText}>{venue.distanceKm} km away</Text>
        </View>
        <View style={styles.sportRow}>
          {venue.sports.map((s) => (
            <View key={s} style={styles.miniChip}>
              <Text style={{ fontSize: 11 }}>{getSportIcon(s)} {getSportName(s)}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ───────────────── SlotGrid ───────────────── */
interface SlotGridProps {
  slots: Slot[];
  selectedId?: string;
  onSelect?: (slot: Slot) => void;
  mode?: 'player' | 'owner';
}
export function SlotGrid({ slots, selectedId, onSelect, mode = 'player' }: SlotGridProps) {
  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.slotAvailable} label="Available" />
        <Legend color={colors.slotBooked} label="Booked" />
        <Legend color={colors.slotBlocked} label="Blocked" />
      </View>
      <View style={styles.slotGrid}>
        {slots.map((slot) => {
          const isSelected = slot.id === selectedId;
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
  venueImg: { width: '100%', height: 150, backgroundColor: colors.surfaceAlt },
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
