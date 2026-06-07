/**
 * Backend DTO types derived from turfbook-backend/src/main/resources/openapi/api.yaml.
 * Do NOT hand-edit — run `npm run generate-api` to regenerate from the spec.
 * IDs are int64 on the backend (number in TS); adapters.ts converts them to string.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'PLAYER' | 'OWNER';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpSendRequest {
  /** Account email. Backend resolves the registered phone and sends OTP there. */
  email: string;
}

export interface OtpSendResponse {
  /** Masked phone where the code was sent, e.g. +91•••••3210. Shows "••••••••" for unknown emails. */
  maskedDestination: string;
  /** Seconds until OTP expires (300 = 5 min). */
  expiresInSec: number;
  /** Seconds until resend is allowed (0 = allowed now). */
  resendAfterSec: number;
}

export interface OtpVerifyRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  token?: string;
  refreshToken?: string;
  user?: UserDto;
}

export interface MessageResponse {
  message?: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserDto {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;           // "PLAYER" | "OWNER" | "ADMIN"
  avatarUrl?: string;
  preferredSports?: string[];
  totalBookings?: number;
  isPremium?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatarUrl?: string;
  preferredSports?: string[];
}

export interface ChangeRoleRequest {
  /** Target role — only PLAYER or OWNER are self-assignable */
  targetRole: 'PLAYER' | 'OWNER';
  /** Current password for re-authentication before role change */
  password: string;
}

// ─── Sport ───────────────────────────────────────────────────────────────────

export interface SportDto {
  id?: number;
  name?: string;
  icon?: string;
}

export interface CreateSportRequest {
  name: string;
  icon: string;
}

export interface UpdateSportRequest {
  name?: string;
  icon?: string;
}

// ─── Venue ───────────────────────────────────────────────────────────────────

export interface VenueSummaryDto {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status?: string;         // "PENDING" | "LIVE" | "REJECTED" | "SUSPENDED"
  rating?: number;
  reviewCount?: number;
  pricePerHour?: number;
  openTime?: string;       // "HH:00" format
  closeTime?: string;      // "HH:00" format
  isActive?: boolean;
  coverPhoto?: string;
  lat?: number;
  lng?: number;
  ownerId?: number;
  sports?: SportDto[];
  amenities?: string[];
}

export interface VenueDetailDto {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  rating?: number;
  reviewCount?: number;
  pricePerHour?: number;
  openTime?: string;       // "HH:00" format
  closeTime?: string;      // "HH:00" format
  isActive?: boolean;
  coverPhoto?: string;
  photos?: string[];
  amenities?: string[];
  lat?: number;
  lng?: number;
  ownerId?: number;
  sports?: SportDto[];
  courts?: CourtDto[];
  createdAt?: string;
}

export interface CreateVenueRequest {
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  description?: string;
  contactPhone: string;
  contactEmail?: string;
  openTime: string;        // "HH:00" format, minutes must be :00
  closeTime: string;       // "HH:00" format, must be after openTime
  pricePerHour: number;
  amenities?: string[];
  lat?: number;
  lng?: number;
  sportIds: number[];
  coverPhoto?: string;
  photos?: string[];
  isActive?: boolean;
  courts?: CreateCourtRequest[];
}

export interface UpdateVenueRequest {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  contactPhone?: string;
  contactEmail?: string;
  state?: string;
  pincode?: string;
  sportIds?: number[];
  lat?: number;
  lng?: number;
  openTime?: string;
  closeTime?: string;
  pricePerHour?: number;
  amenities?: string[];
  coverPhoto?: string;
  photos?: string[];
  isActive?: boolean;
}

export interface ImageUploadResponse {
  url: string;
}

export interface VenueStatusRequest {
  status: 'PENDING' | 'LIVE' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
}

// ─── Court ───────────────────────────────────────────────────────────────────

export interface CourtDto {
  id?: number;
  venueId?: number;
  name?: string;
  sportId?: number;
  type?: string;
  /** null = inherits venue price */
  pricePerHour?: number | null;
  peakPrice?: number;
  /** null = inherits venue openTime */
  openTime?: string | null;
  /** null = inherits venue closeTime */
  closeTime?: string | null;
  slotDurationMins?: number;
  isActive?: boolean;
  /** Server-resolved effective values (read-only) */
  effectivePricePerHour?: number;
  effectiveOpenTime?: string;
  effectiveCloseTime?: string;
}

export interface CreateCourtRequest {
  name: string;
  sportId: number;
  type?: string;
  /** null or omit = inherit venue price */
  pricePerHour?: number | null;
  peakPrice?: number;
  /** null or omit = inherit venue openTime */
  openTime?: string | null;
  /** null or omit = inherit venue closeTime */
  closeTime?: string | null;
  slotDurationMins?: number;
  isActive?: boolean;
}

export interface UpdateCourtRequest {
  name?: string;
  sportId?: number;
  type?: string;
  /** null = revert to inherit */
  pricePerHour?: number | null;
  peakPrice?: number;
  /** null = revert to inherit */
  openTime?: string | null;
  closeTime?: string | null;
  slotDurationMins?: number;
  isActive?: boolean;
}

// ─── Slot ────────────────────────────────────────────────────────────────────

export interface SlotDto {
  id?: number;
  courtId?: number;
  date?: string;           // format: date (YYYY-MM-DD)
  startTime?: string;      // format: time (HH:mm)
  endTime?: string;
  status?: string;         // "AVAILABLE" | "BOOKED" | "BLOCKED"
  price?: number;
}

export interface BulkBlockRequest {
  date: string;
}

export interface BulkCreateBookingRequest {
  venueId: number;
  courtId: number;
  date: string;       // YYYY-MM-DD
  startTimes: string[]; // ["09:00", "10:00"]
  sport: string;
  couponCode?: string;
  paymentMethod?: string;
}

export interface BlockSelectedRequest {
  date: string;
  startTimes: string[];
}

export interface CourtSlotsDto {
  courtId?: number;
  courtName?: string;
  slots?: SlotDto[];
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export interface BookingDto {
  id?: number;
  playerId?: number;
  playerName?: string;
  venueId?: number;
  venueName?: string;
  courtId?: number;
  courtName?: string;
  slotId?: number;
  sport?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  amount?: number;
  convenienceFee?: number;
  discount?: number;
  commission?: number;
  status?: string;         // "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED"
  paymentStatus?: string;  // "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"
  couponCode?: string;
  hasReview?: boolean;
  createdAt?: string;
  groupId?: string;
}

export interface CreateBookingRequest {
  venueId: number;
  courtId: number;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  sport: string;
  couponCode?: string;
  paymentMethod?: string;
}

// ─── Owner Settings ───────────────────────────────────────────────────────────

export interface OwnerSettingsDto {
  autoAcceptBookings?: boolean;
  pushNotificationsEnabled?: boolean;
}

export interface UpdateOwnerSettingsRequest {
  autoAcceptBookings?: boolean;
  pushNotificationsEnabled?: boolean;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface ReviewDto {
  id?: number;
  bookingId?: number;
  venueId?: number;
  playerId?: number;
  playerName?: string;
  rating?: number;
  comment?: string;
  cleanliness?: number;
  ground?: number;
  staff?: number;
  ownerReply?: string;
  createdAt?: string;
}

export interface CreateReviewRequest {
  bookingId: number;
  rating: number;
  comment: string;
  cleanliness: number;
  ground: number;
  staff: number;
}

// ─── Coupon ──────────────────────────────────────────────────────────────────

export interface CouponDto {
  id?: number;
  code?: string;
  discountType?: string;   // "PERCENT" | "FLAT"
  discountValue?: number;
  minBooking?: number;
  maxDiscount?: number;
  validUntil?: string;     // format: date
  usedCount?: number;
  maxUses?: number;
  isActive?: boolean;
}

export interface CreateCouponRequest {
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  minBooking: number;
  maxDiscount?: number;
  validUntil: string;
  maxUses: number;
}

export interface UpdateCouponRequest {
  isActive?: boolean;
}

export interface ValidateCouponRequest {
  code: string;
  bookingAmount: number;
}

export interface CouponValidationResponse {
  valid?: boolean;
  discount?: number;
  message?: string;
}

// ─── Payout ──────────────────────────────────────────────────────────────────

export interface PayoutDto {
  id?: number;
  ownerId?: number;
  ownerName?: string;
  amount?: number;
  commissionDeducted?: number;
  netAmount?: number;
  status?: string;         // "PENDING" | "PROCESSING" | "SETTLED" | "FAILED"
  date?: string;
  createdAt?: string;
}

// ─── Dispute ─────────────────────────────────────────────────────────────────

export interface DisputeDto {
  id?: number;
  bookingId?: number;
  playerId?: number;
  playerName?: string;
  ownerId?: number;
  ownerName?: string;
  venueName?: string;
  issue?: string;
  status?: string;         // "OPEN" | "RESOLVED"
  resolvedNote?: string;
  createdAt?: string;
}

export interface CreateDisputeRequest {
  bookingId: number;
  issue: string;
}

export interface ResolveDisputeRequest {
  resolvedNote: string;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface NotificationDto {
  id?: number;
  userId?: number;
  title?: string;
  body?: string;
  type?: string;           // "BOOKING" | "PAYMENT" | "OFFER" | "REVIEW" | "SYSTEM"
  isRead?: boolean;
  createdAt?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface BroadcastRequest {
  title: string;
  body: string;
  audience: 'ALL' | 'PLAYERS' | 'OWNERS';
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface AdminStatsDto {
  bookingsToday?: number;
  revenueToday?: number;
  newUsers?: number;
  activeVenues?: number;
  pendingApprovals?: number;
  openDisputes?: number;
}

export interface OwnerStatsDto {
  todayBookings?: number;
  todayRevenue?: number;
  weekRevenue?: number;
  monthRevenue?: number;
  pendingPayout?: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface PlatformSettingsDto {
  id?: number;
  commissionPercent?: number;
  convenienceFee?: number;
  maintenanceMode?: boolean;
  autoApproveVenues?: boolean;
}

export interface UpdateSettingsRequest {
  commissionPercent?: number;
  convenienceFee?: number;
  maintenanceMode?: boolean;
  autoApproveVenues?: boolean;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ─── Error ───────────────────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fieldErrors?: FieldError[];
}
