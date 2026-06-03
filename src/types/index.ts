// Shared domain types used across the app.

export type UserRole = 'player' | 'owner' | 'admin';

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export type VenueStatus = 'live' | 'pending' | 'rejected' | 'suspended';

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'held';

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded';

export type DisputeStatus = 'open' | 'resolved';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  preferredSports?: string[];
  totalBookings?: number;
  isPremium?: boolean;
}

export interface Sport {
  id: string;
  name: string;
  icon: string; // emoji
}

export interface Court {
  id: string;
  name: string;
  sportId: string;
  type: string;
  /** null = inherits venue pricePerHour */
  pricePerHour: number | null;
  peakPrice: number;
  /** null = inherits venue openTime */
  openTime: string | null;
  /** null = inherits venue closeTime */
  closeTime: string | null;
  slotDurationMins: number;
  isActive: boolean;
  /** Server-resolved effective values */
  effectivePricePerHour: number;
  effectiveOpenTime: string;
  effectiveCloseTime: string;
}

export interface VenueImage {
  url: string;
  order: number;
  isPrimary: boolean;
}

export interface Venue {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  contactPhone: string;
  contactEmail: string;
  openTime: string;    // "HH:00"
  closeTime: string;   // "HH:00"
  status: VenueStatus;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  pricePerHour: number;
  images?: VenueImage[];  // ordered list; images[0] with isPrimary is the cover; populated by adapter
  photos: string[];       // legacy flat list kept for backward compat
  coverPhoto: string;
  sports: string[]; // sport ids
  amenities: string[];
  courts: Court[];
  isActive: boolean;
  lat: number;
  lng: number;
}

export interface Slot {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  price: number;
}

export interface CourtSlotsGroup {
  courtId: string;
  courtName: string;
  slots: Slot[];
}

export interface Booking {
  id: string;
  playerId: string;
  playerName: string;
  venueId: string;
  venueName: string;
  venuePhoto: string;
  sport: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  amount: number;
  commission: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  hasReview?: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  playerName: string;
  playerAvatar?: string;
  venueId: string;
  rating: number;
  comment: string;
  cleanliness: number;
  ground: number;
  staff: number;
  date: string;
  ownerReply?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minBooking: number;
  maxDiscount?: number;
  validUntil: string;
  usedCount: number;
  maxUses: number;
  isActive: boolean;
}

export interface Payout {
  id: string;
  ownerId: string;
  ownerName: string;
  amount: number;
  commissionDeducted: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'settled' | 'failed';
  date: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  playerName: string;
  ownerName: string;
  venueName: string;
  issue: string;
  status: DisputeStatus;
  date: string;
}

export interface OwnerSettings {
  autoAcceptBookings: boolean;
  pushNotificationsEnabled: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'booking' | 'payment' | 'offer' | 'system' | 'review';
  date: string;
  isRead: boolean;
}
