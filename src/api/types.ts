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
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
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
  status?: string;         // "PENDING" | "LIVE" | "REJECTED" | "SUSPENDED"
  rating?: number;
  reviewCount?: number;
  pricePerSlot?: number;
  coverPhoto?: string;
  lat?: number;
  lng?: number;
  ownerId?: number;
}

export interface VenueDetailDto {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  description?: string;
  status?: string;
  rating?: number;
  reviewCount?: number;
  pricePerSlot?: number;
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
  description?: string;
  pricePerSlot: number;
  amenities?: string[];
  lat: number;
  lng: number;
  sportIds?: number[];
  coverPhoto?: string;
  photos?: string[];
  courts?: CreateCourtRequest[];
}

export interface UpdateVenueRequest {
  name?: string;
  description?: string;
  pricePerSlot?: number;
  amenities?: string[];
  coverPhoto?: string;
  photos?: string[];
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
  pricePerSlot?: number;
  peakPrice?: number;
}

export interface CreateCourtRequest {
  name: string;
  sportId: number;
  type: string;
  pricePerSlot: number;
  peakPrice?: number;
}

export interface UpdateCourtRequest {
  name?: string;
  sportId?: number;
  type?: string;
  pricePerSlot?: number;
  peakPrice?: number;
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
}

export interface CreateBookingRequest {
  venueId: number;
  courtId: number;
  slotId: number;
  sport: string;
  couponCode?: string;
  paymentMethod?: string;
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
