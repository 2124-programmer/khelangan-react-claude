// Venue and booking related reusable components.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { haversineKm } from '../../utils/locationUtils';
import type { LatLng } from '../../store/LocationContext';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { Venue, Slot, Booking, BookingGroup, CancellationReason } from '../../types';
import { StatusBadge, AppButton } from '../common';
import { formatRelativeTime } from '../../utils/dateUtils';
import { getSportIcon, getSportName } from '../../utils/sportUtils';
import { getOpenStatus, amenityIcon } from '../../utils/venueUtils';
import { RatingSummary } from '../reviews';

function callPhone(phone: string | undefined) {
  if (!phone) return;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  Linking.openURL(`tel:${cleaned}`).catch(() => {});
}

function sendWhatsApp(phone: string | undefined, message: string) {
  if (!phone) return;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`).catch(() => {});
}

type TabCtx = 'today' | 'upcoming' | 'completed';

function waBookingMsg(b: { status: string; sport: string; venueName: string; date: string; startTime: string; endTime: string; id: string }, tabCtx?: TabCtx): string {
  const sportName = getSportName(b.sport);
  const details = `${sportName} at ${b.venueName}\nDate: ${b.date}  •  ${b.startTime}–${b.endTime}\nBooking #${b.id}`;
  if (tabCtx === 'today')     return `Hi! Just a reminder — my booking is today:\n${details}`;
  if (tabCtx === 'upcoming')  return `Hi! I have an upcoming booking:\n${details}`;
  if (tabCtx === 'completed') return `Hi! Thanks for the great session!\n${details}`;
  switch (b.status) {
    case 'pending':   return `Hi! I sent a booking request:\n${details}\n\nCould you please accept it?`;
    case 'confirmed': return `Hi! I have a confirmed booking:\n${details}`;
    case 'cancelled': return `Hi! Regarding my cancelled booking:\n${details}\n\n`;
    default:          return `Hi! Regarding my booking:\n${details}`;
  }
}

function waOwnerBookingMsg(b: { playerName: string; venueName: string; date: string; startTime: string; endTime: string; status: string }, tabCtx?: TabCtx): string {
  const details = `${b.venueName}\n📅 ${b.date}  •  ${b.startTime}–${b.endTime}`;
  if (tabCtx === 'today')     return `Score-Adda Reminder !!! \n Hi ${b.playerName}!!! \n — your booking is today:\n${details}`;
  if (tabCtx === 'upcoming')  return `Score-Adda Reminder !!! \n Hi ${b.playerName}!!! \n Your upcoming booking:\n${details}`;
  if (tabCtx === 'completed') return `Score-Adda Reminder !!! \n Hi ${b.playerName}!!! \n Thanks for visiting us!\n${details}\n\nHope you had a great game!`;
  return `Hi ${b.playerName}! Your booking at ${b.venueName}:\n📅 ${b.date}  •  ${b.startTime}–${b.endTime}\nStatus: ${b.status}`;
}

function waGroupMsg(group: BookingGroup, slotTimes: string, tabCtx?: TabCtx): string {
  const sportName = getSportName(group.sport);
  const details = `${sportName} at ${group.venueName}\nDate: ${group.date}  •  ${slotTimes}\nTotal: ₹${group.totalAmount}`;
  if (tabCtx === 'today')     return `Hi ${group.playerName}! Reminder — your booking is today:\n${details}`;
  if (tabCtx === 'upcoming')  return `Hi ${group.playerName}! Your upcoming booking:\n${details}`;
  if (tabCtx === 'completed') return `Hi ${group.playerName}! Thanks for visiting us!\n${details}\n\nHope you had a great game!`;
  switch (group.status) {
    case 'pending':   return `Hi ${group.playerName}! Your booking request:\n${details}\n\nWe'll confirm shortly.`;
    case 'confirmed': return `Hi ${group.playerName}! Your booking is confirmed:\n${details}`;
    default:          return `Hi ${group.playerName}! Regarding your booking:\n${details}`;
  }
}

function waPlayerGroupMsg(group: BookingGroup, slotTimes: string, tabCtx?: TabCtx): string {
  const sportName = getSportName(group.sport);
  const details = `${sportName} at ${group.venueName}\nDate: ${group.date}  •  ${slotTimes}\nTotal: ₹${group.totalAmount}`;
  if (tabCtx === 'today')     return `Hi! Just a reminder — my booking is today:\n${details}`;
  if (tabCtx === 'upcoming')  return `Hi! I have an upcoming booking:\n${details}`;
  if (tabCtx === 'completed') return `Hi! Thanks for the great experience!\n${details}`;
  switch (group.status) {
    case 'confirmed': return `Hi! I have a confirmed booking:\n${details}`;
    default:          return `Hi! Regarding my booking:\n${details}`;
  }
}

function ContactBtns({ phone, waMsg }: { phone?: string; waMsg: string }) {
  if (!phone) return null;
  return (
    <View style={cbStyles.row}>
      <TouchableOpacity onPress={() => callPhone(phone)} style={cbStyles.callBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={cbStyles.callIcon}>📞</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => sendWhatsApp(phone, waMsg)} style={cbStyles.waBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={cbStyles.waText}>W</Text>
      </TouchableOpacity>
    </View>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  callBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  waBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  callIcon: { fontSize: 14 },
  waText: { color: '#fff', fontSize: 13, fontWeight: fontWeight.bold },
});

// Single "Contact" pill — opens a Call/WhatsApp chooser handled by the screen.
function ContactButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.contactBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.contactBtnText}>📞</Text>
    </TouchableOpacity>
  );
}

export { VenueImagePicker } from './VenueImagePicker';
export type { PickedImage } from './VenueImagePicker';
export { VenueImageCarousel } from './VenueImageCarousel';

/* ───────────────── VenueCard helpers ───────────────── */

function MostBookedBadge() {
  return (
    <View style={vc.mostBookedBadge}>
      <Text style={vc.mostBookedText}>🔥 Most Booked</Text>
    </View>
  );
}

// Icon-only sport in a white circle, overlaid on the cover image (per the target design).
function SportCircle({ sportId }: { sportId: string }) {
  return (
    <View style={vc.sportCircle}>
      <Text style={vc.sportCircleIcon}>{getSportIcon(sportId)}</Text>
    </View>
  );
}

// Centered row of up to 4 white sport circles on the image bottom, then a "+N" circle.
function SportCircles({ sports }: { sports: string[] }) {
  const MAX = 4;
  const shown = sports.slice(0, MAX);
  const extra = sports.length - shown.length;
  return (
    <View style={vc.sportCircleRow} pointerEvents="none">
      {shown.map((s) => <SportCircle key={s} sportId={s} />)}
      {extra > 0 && (
        <View style={vc.sportCircle}>
          <Text style={vc.sportCirclePlus}>+{extra}</Text>
        </View>
      )}
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

// Heart overlay — nested touchable captures the tap so the card's onPress doesn't fire.
function FavoriteHeart({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={vc.heart}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Text style={[vc.heartIcon, active && vc.heartIconActive]}>{active ? '♥' : '♡'}</Text>
    </TouchableOpacity>
  );
}

/* ───────────────── VenueCard ───────────────── */
interface VenueCardProps {
  venue: Venue;
  onPress: () => void;
  userLocation?: LatLng;
  onToggleFavorite?: () => void;
}

export function VenueCard({ venue, onPress, userLocation, onToggleFavorite }: VenueCardProps) {
  const coverUri =
    venue.images?.find((i) => i.isPrimary)?.url ??
    venue.images?.[0]?.url ??
    venue.coverPhoto;

  // Distance by the name (target style: "3.2 km" / "850 m", no "away"). Shown only when known.
  const distanceLabel = useMemo(() => {
    let km: number | null = null;
    if (userLocation && venue.lat && venue.lng) {
      km = haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng);
    } else if (venue.distanceKm > 0) {
      km = venue.distanceKm;
    }
    if (km == null) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
  }, [userLocation, venue.lat, venue.lng, venue.distanceKm]);

  // Open/closed is an enrichment — only render the pill when we have both hours.
  const openStatus = useMemo(
    () => (venue.openTime && venue.closeTime ? getOpenStatus(venue.openTime, venue.closeTime) : null),
    [venue.openTime, venue.closeTime],
  );
  const topAmenities = (venue.amenities ?? []).slice(0, 4);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[vc.card, shadow.card]}>

      {/* ── Image ── */}
      <View style={vc.imageWrap}>
        <Image source={{ uri: coverUri }} style={vc.image} resizeMode="cover" />
        <View style={vc.imageOverlay} />

        {/* Top overlay: New/rating (+ offer) left, favorite right */}
        <View style={vc.imageBadgeRow}>
          <View style={vc.topLeftStack}>
            <View style={vc.ratingBadge}>
              <RatingSummary
                ratingAverage={venue.ratingAverage}
                ratingCount={venue.ratingCount}
                variant="compact"
                darkBg
              />
            </View>
            {venue.activeOfferLabel ? (
              <View style={vc.offerBadge}>
                <Text style={vc.offerBadgeText}>🏷 {venue.activeOfferLabel}</Text>
              </View>
            ) : null}
          </View>
          <View style={vc.badgeRight}>
            {venue.isMostBooked && <MostBookedBadge />}
            {onToggleFavorite && <FavoriteHeart active={!!venue.isFavorite} onPress={onToggleFavorite} />}
          </View>
        </View>

        {/* Sport icons in white circles, overlaid on the image bottom */}
        {venue.sports?.length > 0 && <SportCircles sports={venue.sports} />}
      </View>

      {/* ── Body ── */}
      <View style={vc.body}>

        {/* Row 1: name + distance on one line */}
        <View style={vc.nameRow}>
          <Text style={vc.venueName} numberOfLines={1}>{venue.name}</Text>
          {distanceLabel && <Text style={vc.distanceText}>{distanceLabel}</Text>}
        </View>

        {/* Row 2: locality */}
        <Text style={vc.venueAddr} numberOfLines={1}>📍 {venue.address}</Text>

        {/* Meta row: open/closed · courts · amenity highlights — each degrades gracefully */}
        {(openStatus || venue.courtCount > 0 || topAmenities.length > 0) && (
          <View style={vc.metaRow}>
            {openStatus && (
              <View style={[vc.openPill, openStatus.isOpen ? vc.openPillOpen : vc.openPillClosed]}>
                <Text style={[vc.openPillText, openStatus.isOpen ? vc.openPillTextOpen : vc.openPillTextClosed]}>
                  {openStatus.label}
                </Text>
              </View>
            )}
            {venue.courtCount > 0 && (
              <Text style={vc.metaText}>{venue.courtCount} {venue.courtCount === 1 ? 'court' : 'courts'}</Text>
            )}
            {topAmenities.length > 0 && (
              <Text style={vc.amenityIcons} numberOfLines={1}>
                {topAmenities.map((a) => amenityIcon(a)).join('  ')}
              </Text>
            )}
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
    alignItems: 'flex-start',
  },
  topLeftStack: { gap: spacing.sm, alignItems: 'flex-start' },
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
  badgeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  offerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16A34A', paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.sm,
  },
  offerBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  heart: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  heartIcon: { fontSize: 18, color: colors.white, lineHeight: 20 },
  heartIconActive: { color: '#FF4D67' },
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  venueName: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  distanceText: {
    fontSize: fontSize.sm,
    color: colors.textMid,
    fontWeight: fontWeight.medium,
  },
  venueAddr: {
    fontSize: fontSize.sm,
    color: colors.textMid,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  sportCircleRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sportCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  sportCircleIcon: { fontSize: 15 },
  sportCirclePlus: { fontSize: 12, fontWeight: fontWeight.bold, color: colors.textMid },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  openPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  openPillOpen: { backgroundColor: '#DCFCE7' },
  openPillClosed: { backgroundColor: '#FEE2E2' },
  openPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  openPillTextOpen: { color: '#15803D' },
  openPillTextClosed: { color: '#B91C1C' },
  metaText: { fontSize: fontSize.xs, color: colors.textMid },
  amenityIcons: { fontSize: 13, marginLeft: 'auto' },
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
  pastSlotIds?: Set<string>;
}
export function SlotGrid({ slots, selectedIds, onSelect, mode = 'player', pastSlotIds }: SlotGridProps) {
  return (
    <View>
      <View style={styles.legendRow}>
        <Legend color={colors.slotAvailable} label="Available" />
        <Legend color={colors.slotBooked} label="Booked" />
        <Legend color={colors.slotBlocked} label="Blocked" />
        <Legend color={colors.slotSelected} label="Selected" />
      </View>
      <View style={styles.slotGrid}>
        {slots.map((slot) => {
          const isSelected = selectedIds?.has(slot.id) ?? false;
          const isPast = pastSlotIds?.has(slot.id) ?? false;
          const disabled = slot.status !== 'available' || mode === 'owner' || isPast;
          const bg =
            isSelected ? colors.slotSelected
            : isPast ? colors.surfaceAlt
            : slot.status === 'available' ? colors.primaryLight
            : slot.status === 'booked' ? '#FEE2E2'
            : colors.surfaceAlt;
          const fg =
            isSelected ? colors.white
            : isPast ? colors.textDim
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
              accessibilityState={{ disabled: mode === 'player' && disabled }}
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

/* ───────────────── Cancellation label helper ───────────────── */
function getCancelLabel(status: Booking['status'], reason?: CancellationReason): string | undefined {
  if (status === 'rejected' || reason === 'owner') return 'Rejected by Owner';
  if (status === 'cancelled' && reason === 'player') return 'Cancelled by You';
  if (status === 'cancelled' && reason === 'time_over') return 'Time Expired';
  if (status === 'expired') return 'Time Expired';
  return undefined;
}

/* ───────────────── Status-aware timestamp helper ───────────────── */
// Maps each booking status to a human label + the most meaningful source timestamp.
// Owner sees "Requested {time}" for pending items (when request arrived).
// Player sees "Accepted {time}" once confirmed (when owner acted).
function getBookingTimestampInfo(
  status: Booking['status'],
  createdAt: string | undefined,
  updatedAt: string | undefined,
): { label: string; ts: string } | null {
  const effective = updatedAt ?? createdAt;
  switch (status) {
    case 'pending':    return createdAt ? { label: 'Requested',  ts: createdAt } : null;
    case 'confirmed':  return effective ? { label: 'Accepted',   ts: effective } : null;
    case 'rejected':   return effective ? { label: 'Declined',   ts: effective } : null;
    case 'cancelled':  return effective ? { label: 'Cancelled',  ts: effective } : null;
    case 'completed':  return effective ? { label: 'Completed',  ts: effective } : null;
    case 'checked_in': return effective ? { label: 'Checked in', ts: effective } : null;
    case 'expired':    return effective ? { label: 'Expired',    ts: effective } : null;
    default:           return effective ? { label: 'Updated',    ts: effective } : null;
  }
}

/* ───────────────── BookingCard ───────────────── */
interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  onRebook?: () => void;
  onCheckIn?: () => void;
  onContact?: () => void;
  viewAs?: 'player' | 'owner';
  showContact?: boolean;
  tabCtx?: TabCtx;
}
export function BookingCard({ booking, onPress, onCancel, onReview, onRebook, onCheckIn, onContact, viewAs = 'player', showContact, tabCtx }: BookingCardProps) {
  const counterpartPhone = viewAs === 'owner' ? booking.playerPhone : booking.venuePhone;
  const waMsg = viewAs === 'owner'
    ? waOwnerBookingMsg(booking, tabCtx)
    : waBookingMsg(booking, tabCtx);
  const hasActions = onCancel || onReview || onRebook || onCheckIn;
  const cancelLabel = getCancelLabel(booking.status, booking.cancellationReason);
  const tsInfo = getBookingTimestampInfo(booking.status, booking.createdAt, booking.updatedAt);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.bookingCard, shadow.card]}>
      <View style={{ flexDirection: 'row' }}>
        <Image source={{ uri: booking.venuePhoto }} style={styles.bookingImg} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>

          {/* Row 1: venue name + status */}
          <View style={styles.bcRow}>
            <Text style={[styles.bookingVenue, { flex: 1 }]} numberOfLines={1}>{booking.venueName}</Text>
            <StatusBadge status={booking.status} label={cancelLabel} />
          </View>

          {/* Row 2: sport + court */}
          <Text style={styles.bookingMeta}>
            {getSportIcon(booking.sport)} {getSportName(booking.sport)} · {booking.courtName}
          </Text>

          {/* Row 3: date + time */}
          <Text style={styles.bookingMeta}>📅 {booking.date}  •  {booking.startTime}–{booking.endTime}</Text>

          {/* Row 4 (owner): player name + contact */}
          {viewAs === 'owner' && (
            <View style={[styles.bcRow, { marginTop: 4 }]}>
              <Text style={[styles.bookingMeta, { marginTop: 0, flex: 1 }]} numberOfLines={1}>👤 {booking.playerName}</Text>
              {showContact && <ContactBtns phone={counterpartPhone} waMsg={waMsg} />}
            </View>
          )}

          {/* Row 4 (player): amount + contact */}
          {viewAs === 'player' && (
            <View style={[styles.bcRow, { marginTop: 4 }]}>
              <Text style={styles.bookingAmount}>₹{booking.amount}</Text>
              {onContact && counterpartPhone ? <ContactButton onPress={onContact} /> : null}
            </View>
          )}

          {/* Amount for owner view (separate row) */}
          {viewAs === 'owner' && <Text style={styles.bookingAmount}>₹{booking.amount}</Text>}
        </View>
      </View>

      {tsInfo && (
        <Text style={styles.updatedAt}>{tsInfo.label} {formatRelativeTime(tsInfo.ts)}</Text>
      )}

      {hasActions && (
        <View style={styles.actionRow}>
          {booking.status === 'confirmed' && onCheckIn && (
            <AppButton label="Check In" fullWidth={false} onPress={onCheckIn} style={{ flex: 1, height: 40 }} />
          )}
          {booking.status === 'confirmed' && onCancel && (
            <AppButton label="Cancel" variant="danger" fullWidth={false} onPress={onCancel} style={{ flex: 1, height: 40 }} />
          )}
          {booking.status === 'completed' && !booking.hasReview && onReview && (
            <AppButton label="Rate & Review" variant="ghost" fullWidth={false} onPress={onReview} style={{ flex: 1, height: 40 }} />
          )}
          {(booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'expired') && onRebook && (
            <AppButton label="Rebook" variant="secondary" fullWidth={false} onPress={onRebook} style={{ flex: 1, height: 40 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ───────────────── GroupedBookingCard ───────────────── */
interface GroupedBookingCardProps {
  group: BookingGroup;
  viewAs?: 'player' | 'owner';
  onPress?: () => void;
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onCancelAll?: () => void;
  onCheckInAll?: () => void;
  acceptPending?: boolean;
  rejectPending?: boolean;
  checkInPending?: boolean;
  onContact?: () => void;
  showContact?: boolean;
  tabCtx?: TabCtx;
}
export function GroupedBookingCard({
  group, viewAs = 'player', onPress,
  onAcceptAll, onRejectAll, onCancelAll, onCheckInAll,
  acceptPending, rejectPending, checkInPending,
  onContact, showContact, tabCtx,
}: GroupedBookingCardProps) {
  const sorted = group.bookings.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
  const isContiguous =
    sorted.length > 1 &&
    sorted.every((b, i) => i === 0 || b.startTime === sorted[i - 1].endTime);
  const slotTimes = isContiguous
    ? `${sorted[0].startTime}–${sorted[sorted.length - 1].endTime}`
    : sorted.map((b) => `${b.startTime}–${b.endTime}`).join(', ');

  const canAct = group.status === 'pending';
  const canCheckIn = group.status === 'confirmed' && !!onCheckInAll;
  const counterpartPhone = viewAs === 'owner' ? group.playerPhone : group.venuePhone;
  const waMsg = viewAs === 'owner'
    ? waGroupMsg(group, slotTimes, tabCtx)
    : waPlayerGroupMsg(group, slotTimes, tabCtx);
  const cancelLabel = getCancelLabel(group.status, group.cancellationReason);
  const tsInfo = getBookingTimestampInfo(group.status, group.createdAt, group.updatedAt);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[gbStyles.card, shadow.card]}>

      {/* Row 1: Venue name + Status badge + Slots count */}
      <View style={gbStyles.row}>
        <Text style={[gbStyles.venueName, { flex: 1 }]} numberOfLines={1}>{group.venueName}</Text>
        <View style={gbStyles.badgeGroup}>
          <StatusBadge status={group.status} label={cancelLabel} />
          <View style={gbStyles.slotBadge}>
            <Text style={gbStyles.slotBadgeText}>{group.bookings.length} slots</Text>
          </View>
        </View>
      </View>

      {/* Row 2: Date + slot time range */}
      <Text style={[gbStyles.infoText, { marginTop: 6 }]} numberOfLines={1}>
        📅 {group.date}{'  '}{slotTimes}
      </Text>

      {/* Row 3: Sport icon + sport name + court */}
      <Text style={gbStyles.sportText}>
        {getSportIcon(group.sport)} {getSportName(group.sport)} · {group.courtName}
      </Text>

      {/* Row 4 (owner): Player name + Call + WhatsApp inline */}
      {viewAs === 'owner' && (
        <View style={[gbStyles.row, { marginTop: 6 }]}>
          <Text style={[gbStyles.playerText, { flex: 1 }]} numberOfLines={1}>👤 {group.playerName}</Text>
          {showContact && <ContactBtns phone={counterpartPhone} waMsg={waMsg} />}
        </View>
      )}

      {/* Status-aware timestamp */}
      {tsInfo && (
        <Text style={gbStyles.updatedAt}>{tsInfo.label} {formatRelativeTime(tsInfo.ts)}</Text>
      )}

      {/* Divider */}
      <View style={gbStyles.divider} />

      {/* Footer: Total inline + Actions on same row */}
      <View style={gbStyles.footerRow}>
        <View style={gbStyles.totalInlineRow}>
          <Text style={gbStyles.totalLabel}>Total</Text>
          <Text style={gbStyles.totalAmount}>₹{group.totalAmount}</Text>
        </View>
        {viewAs === 'owner' && canAct && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AppButton
              label={acceptPending ? '…' : 'Accept'}
              fullWidth={false}
              loading={acceptPending}
              disabled={acceptPending || rejectPending}
              onPress={onAcceptAll}
              style={{ height: 38, paddingHorizontal: 14 }}
            />
            <AppButton
              label={rejectPending ? '…' : 'Reject'}
              variant="danger"
              fullWidth={false}
              loading={rejectPending}
              disabled={acceptPending || rejectPending}
              onPress={onRejectAll}
              style={{ height: 38, paddingHorizontal: 14 }}
            />
          </View>
        )}
        {viewAs === 'owner' && canCheckIn && (
          <AppButton
            label={checkInPending ? '…' : 'Check In'}
            fullWidth={false}
            loading={checkInPending}
            disabled={checkInPending}
            onPress={onCheckInAll}
            style={{ height: 40, paddingHorizontal: 24 }}
          />
        )}
        {viewAs === 'player' && (onContact || (canAct && onCancelAll)) && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {onContact && counterpartPhone ? <ContactButton onPress={onContact} /> : null}
            {canAct && onCancelAll && (
              <AppButton
                label="Cancel"
                variant="danger"
                fullWidth={false}
                onPress={onCancelAll}
                style={{ height: 38, paddingHorizontal: 14 }}
              />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const gbStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  venueName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  badgeGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 },
  infoText: { fontSize: fontSize.sm, color: colors.textMid },
  slotBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  slotBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.white },
  sportText: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  playerText: { fontSize: fontSize.xs, color: colors.textMid },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  updatedAt: { fontSize: 10, color: colors.textDim, marginTop: spacing.xs },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalInlineRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  totalLabel: { fontSize: fontSize.xs, color: colors.textDim },
  totalAmount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
});

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
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  legendText: { fontSize: fontSize.xs, color: colors.textMid },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slot: { width: '31%', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  slotTime: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  slotPrice: { fontSize: fontSize.xs, marginTop: 2 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  bookingImg: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  updatedAt: { fontSize: 10, color: colors.textDim, marginTop: spacing.xs },
  bookingVenue: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  bookingMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 3 },
  bookingAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
  bcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 38, paddingHorizontal: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight,
  },
  contactBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primaryDark },
  priceBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  priceLabel: { fontSize: fontSize.sm, color: colors.textMid },
  priceValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
