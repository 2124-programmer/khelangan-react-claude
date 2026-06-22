// Shared domain types used across the app.

export type UserRole = 'player' | 'owner' | 'admin';

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'completed'
  | 'checked_in'
  | 'cancelled'
  | 'rejected'
  | 'expired';

export type CancellationReason = 'player' | 'owner' | 'time_over';

export type VenueStatus = 'draft' | 'live' | 'pending' | 'rejected' | 'suspended' | 'changes_requested';

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
  contactEmail?: string; // owner-facing only; not returned by player-detail endpoint
  openTime: string;    // "HH:00"
  closeTime: string;   // "HH:00"
  status: VenueStatus;
  ratingAverage: number | null;
  ratingCount: number;
  distanceKm: number;
  pricePerHour: number;
  images?: VenueImage[];  // ordered list; images[0] with isPrimary is the cover; populated by adapter
  photos: string[];       // legacy flat list kept for backward compat
  coverPhoto: string;
  sports: string[]; // sport ids
  amenities: string[];
  courts: Court[];
  courtCount: number;  // from list endpoints; equals courts.length on detail endpoints
  isActive: boolean;
  lat: number;
  lng: number;
  isMostBooked?: boolean;
  submittedAt?: string;  // ISO submission/registration timestamp (admin/owner contexts)
  subscriptionBadge?: VenueSubscriptionBadge; // owner list only
  approvalComments?: VenueApprovalComment[];  // owner/admin only
}

// Compact subscription badge: plan + remaining days for owner status display.
export interface VenueSubscriptionBadge {
  planCode: string;
  planName: string;
  status: string;        // TRIALING | ACTIVE | PAST_DUE | EXPIRED | CANCELED | VOIDED
  effectiveEnd: string | null;
  remainingDays: number;
  expiringSoon: boolean;
}

// One entry in a venue's approval thread.
export interface VenueApprovalComment {
  id: string;
  action: string;        // SUBMITTED | CHANGES_REQUESTED | REJECTED | RESUBMITTED | APPROVED
  authorRole: string;    // ADMIN | OWNER
  comment: string | null;
  createdAt: string | null;
}

// Admin-only venue review context: full venue listing + owner details + history.
export interface AdminVenueOwner {
  id: string;
  name: string;
  phone: string;
  email: string;
  registeredOn?: string; // ISO date-time of owner account creation
}

export interface OwnerVenueHistory {
  totalVenues: number;
  liveVenues: number;
}

export interface AdminVenueDetail {
  venue: Venue;
  owner: AdminVenueOwner;
  ownerHistory: OwnerVenueHistory;
  intendedPlanCode: string | null;
  commentHistory: VenueApprovalComment[];
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
  playerPhone?: string;
  venueId: string;
  venueName: string;
  venuePhoto: string;
  venuePhone?: string;
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
  groupId?: string;
  cancellationReason?: CancellationReason;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingGroup {
  groupId: string;
  bookings: Booking[];
  venueName: string;
  courtName: string;
  sport: string;
  date: string;
  totalAmount: number;
  status: BookingStatus;
  playerId: string;
  playerName: string;
  playerPhone?: string;
  venuePhone?: string;
  cancellationReason?: CancellationReason;
  createdAt?: string;
  updatedAt?: string;
}

export interface Review {
  id: string;
  venueId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;       // ISO date-time string
  isOwn: boolean;
  venueName?: string;      // populated on owner endpoint only
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
  referenceId?: string;   // bookingId or groupId
  referenceType?: string; // "BOOKING" | "BOOKING_GROUP"
}

// ─── Subscriptions ─────────────────────────────────────────────────────────
// IDs are strings (per project convention); enum-valued fields stay as the
// backend's uppercase strings since the UI maps them to labels/colors.

export type SubscriptionStatus =
  'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED' | 'VOIDED';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  maxCourts: number;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  features: string[];
  photoLimit: number;
  placementWeight: number;
  trialDays: number;
  active: boolean;
  displayOrder: number;
}

export interface Subscription {
  id: string;
  ownerId: string;
  venueId: string;
  planId: string;
  planCode: string;
  planName: string;
  billingCycle: string;
  status: SubscriptionStatus;
  periodStart: string;
  periodEnd: string;
  trialEnd?: string | null;
  price: number;
  currency: string;
  maxCourts: number;
  features: string[];
  activationSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionChangeRequest {
  id: string;
  ownerId: string;
  venueId: string;
  currentSubscriptionId?: string | null;
  requestedPlanId: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  requestedCycle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  decidedAt?: string | null;
  reason?: string;
}

export interface VenueSubscriptionView {
  current?: Subscription | null;
  courtsUsed: number;
  courtsAllowed: number;
  history: Subscription[];
  pendingChangeRequest?: SubscriptionChangeRequest | null;
}
