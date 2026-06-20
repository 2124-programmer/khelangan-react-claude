import { Booking, BookingGroup, BookingStatus, CancellationReason } from '../types';

export type BookingListItem = Booking | BookingGroup;

export function isGroup(item: BookingListItem): item is BookingGroup {
  return 'groupId' in item && 'bookings' in item;
}

export function deriveGroupStatus(bookings: Booking[]): BookingStatus {
  const isDone = (s: BookingStatus) => s === 'completed' || s === 'checked_in';
  if (bookings.every((b) => b.status === 'pending')) return 'pending';
  if (bookings.every((b) => b.status === 'confirmed')) return 'confirmed';
  if (bookings.every((b) => b.status === 'cancelled')) return 'cancelled';
  if (bookings.every((b) => isDone(b.status))) return 'completed';
  if (bookings.every((b) => b.status === 'rejected')) return 'rejected';
  if (bookings.some((b) => b.status === 'confirmed')) return 'confirmed';
  return bookings[0].status;
}

export function groupBookingList(bookings: Booking[]): BookingListItem[] {
  const groupMap = new Map<string, Booking[]>();
  const seenGroups = new Set<string>();
  const result: BookingListItem[] = [];

  for (const b of bookings) {
    if (b.groupId) {
      if (!groupMap.has(b.groupId)) groupMap.set(b.groupId, []);
      groupMap.get(b.groupId)!.push(b);
    }
  }

  for (const b of bookings) {
    if (!b.groupId) {
      result.push(b);
    } else if (!seenGroups.has(b.groupId)) {
      seenGroups.add(b.groupId);
      const grouped = groupMap.get(b.groupId)!.sort((a, c) => a.startTime.localeCompare(c.startTime));
      result.push({
        groupId: b.groupId,
        bookings: grouped,
        venueName: b.venueName,
        courtName: b.courtName,
        sport: b.sport,
        date: b.date,
        totalAmount: grouped.reduce((sum, g) => sum + g.amount, 0),
        status: deriveGroupStatus(grouped),
        cancellationReason: grouped[0]?.cancellationReason,
        playerId: b.playerId,
        playerName: b.playerName,
        playerPhone: b.playerPhone,
        venuePhone: b.venuePhone,
      } as BookingGroup);
    }
  }

  return result;
}

/**
 * A PENDING booking is considered expired client-side once its slot endTime has passed.
 * A booking in progress (startTime < now < endTime) is still shown as pending.
 * Pure function so it can be unit-tested independently.
 */
export function isExpiredPending(booking: Booking, todayStr: string, nowMins: number): boolean {
  if (booking.status !== 'pending') return false;
  if (booking.date < todayStr) return true;
  if (booking.date === todayStr) {
    const [h, m] = (booking.endTime ?? '23:59').split(':').map(Number);
    return h * 60 + m <= nowMins;
  }
  return false;
}
