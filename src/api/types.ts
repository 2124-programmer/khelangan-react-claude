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
  acceptedTerms: boolean;
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

// ─── Change Password ──────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ─── Password Reset (email OTP flow) ─────────────────────────────────────────

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  email: string;
  otp: string;
}

export interface PasswordResetVerifyResponse {
  resetToken: string;
}

export interface PasswordResetConfirmRequest {
  resetToken: string;
  newPassword: string;
}

// ─── Email Change ─────────────────────────────────────────────────────────────

export interface EmailChangeCreateRequest {
  newEmail: string;
}

export interface EmailChangeVerifyRequest {
  otp: string;
}

export interface EmailChangeRequestDto {
  id?: number;
  userId?: number;
  currentEmail?: string;
  newEmail?: string;
  status?: 'PENDING_VERIFICATION' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  decidedAt?: string;
  reason?: string;
}

export interface EmailChangeRejectRequest {
  reason?: string;
}

// ─── Phone change (self-service OTP) ───────────────────────────────────────────

export interface PhoneChangeCreateRequest {
  newPhone: string;
}

export interface PhoneChangeVerifyRequest {
  otp: string;
}

export interface PhoneChangeRequestDto {
  id?: number;
  userId?: number;
  currentPhone?: string;
  newPhone?: string;
  status?: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
  decidedAt?: string;
  reason?: string;
}

// ─── Player settings ───────────────────────────────────────────────────────────

export interface PlayerSettingsDto {
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
}

export interface UpdatePlayerSettingsRequest {
  pushNotificationsEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
}

// ─── Account deletion + push tokens ────────────────────────────────────────────

export interface DeleteAccountRequest {
  password: string;
  reason?: string;
}

export interface RegisterPushTokenRequest {
  token: string;
  platform?: string;
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
  /** Effective admin sub-role; null for non-admins. Legacy admins resolve to SUPER_ADMIN. */
  adminRole?: AdminRoleValue | null;
  avatarUrl?: string;
  preferredSports?: string[];
  totalBookings?: number;
  isPremium?: boolean;
  isBlocked?: boolean;
  createdAt?: string;
}

/** Admin sub-roles (RBAC). See AdminPermissionService on the backend. */
export type AdminRoleValue = 'SUPER_ADMIN' | 'SUPPORT' | 'READ_ONLY';

/** One admin in the super-admin "Admin Roles" management list (GET /api/v1/admin/admins). */
export interface AdminSummary {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  adminRole: AdminRoleValue;
  self: boolean;
}

export interface SetAdminRoleRequest {
  adminRole: AdminRoleValue;
}

/** Create a brand-new admin account (POST /api/v1/admin/admins). */
export interface CreateAdminRequest {
  name: string;
  email: string;
  password: string;
  adminRole: AdminRoleValue;
}

/** Promote an existing user to admin by email (POST /api/v1/admin/admins/promote). */
export interface PromoteAdminRequest {
  email: string;
  adminRole: AdminRoleValue;
}

/** How a super-admin removes an admin: revoke (demote to player) or deactivate (soft-delete). */
export type RemoveAdminMode = 'demote' | 'deactivate';

/** Non-sensitive runtime/config snapshot for the super-admin App Configuration screen. */
export interface SystemInfo {
  appName?: string;
  environment?: string;
  baseUrl?: string;
  serverPort?: string;
  apiBasePath?: string;
  databaseName?: string;
  databaseHost?: string;
  databaseProduct?: string;
  mailHost?: string;
  mailFrom?: string;
  uploadDir?: string;
  jwtExpiration?: string;
  javaVersion?: string;
  serverTimeZone?: string;
  serverTime?: string;
  uptime?: string;
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
  ratingAverage?: number | null;
  ratingCount?: number;
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
  courtCount?: number;     // returned by owner list endpoint
  featured?: boolean;
  isFavorite?: boolean;    // true when the current authenticated player has favorited this venue
  activeOffer?: { label?: string } | null; // best active owner-funded promo, or null
  createdAt?: string;      // submission/registration timestamp (ISO); used for submission age + oldest-first
  subscription?: VenueSubscriptionSummary; // owner list only — compact badge data
}

export interface VenueSubscriptionSummary {
  planCode?: string;
  planName?: string;
  status?: string;          // TRIALING | ACTIVE | PAST_DUE | EXPIRED | CANCELED | VOIDED
  effectiveEnd?: string;    // ISO; trialEnd when trialing else periodEnd
  remainingDays?: number;
  expiringSoon?: boolean;
}

export interface VenueDetailDto {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  description?: string;
  contactPhone?: string;    // returned only to authenticated callers; null/omitted for guests
  contactAvailable?: boolean; // true when the venue has a contact number on file (no number leaked)
  contactEmail?: string; // stripped from public player-detail response; may appear on owner-facing calls
  status?: string;
  ratingAverage?: number | null;
  ratingCount?: number;
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
  approvalComments?: VenueApprovalComment[]; // owner/admin-only approval thread
}

export interface VenueApprovalComment {
  id?: number;
  action?: string;       // SUBMITTED | CHANGES_REQUESTED | REJECTED | RESUBMITTED | APPROVED
  authorRole?: string;   // ADMIN | OWNER
  comment?: string;
  createdAt?: string;
}

export interface SubmitVenueRequest {
  planId?: number;       // required only when the venue has >2 courts
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
  status: 'DRAFT' | 'PENDING' | 'LIVE' | 'REJECTED' | 'SUSPENDED' | 'CHANGES_REQUESTED';
  rejectionReason?: string;
}

// ─── Admin venue detail (full listing + owner context) ───────────────────────

export interface AdminOwnerDto {
  id?: number;
  name?: string;
  phone?: string;
  email?: string;
  registeredOn?: string; // ISO date-time of owner account creation
}

export interface OwnerVenueHistoryDto {
  totalVenues?: number;
  liveVenues?: number;
}

export interface VenueCompletenessCheckDto {
  key?: string;   // PHOTOS | COURT | ADDRESS | PHONE
  label?: string;
  done?: boolean;
}
export interface VenueCompletenessDto {
  percent?: number;
  checks?: VenueCompletenessCheckDto[];
}
export interface VenueCountsDto {
  all?: number;
  pending?: number;
  changesRequested?: number;
  approved?: number;
  rejected?: number;
}

// ─── Admin Players ────────────────────────────────────────────────────────
export interface PlayerStatsDto {
  totalPlayers?: number;
  newThisWeek?: number;
  activeRatePct?: number;
  flaggedCount?: number;
}
export interface PlayerRowDto {
  playerId?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  riskLevel?: string;
  riskReason?: string | null;
  bookingCount?: number;
  totalSpend?: number;
  lastActiveAt?: string | null;
  joinedAt?: string | null;
}
export interface PlayerPageDto {
  content?: PlayerRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface PlayerStatsBlockDto {
  bookingCount?: number;
  totalSpend?: number;
  refundCount?: number;
  refundTotal?: number;
  reviewCount?: number;
  cancellationRatePct?: number;
  noShowCount?: number;
}
export interface PlayerAdminDetailDto {
  playerId?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  riskLevel?: string;
  riskReason?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  stats?: PlayerStatsBlockDto;
  suspension?: { reason?: string | null; until?: string | null } | null;
  deletion?: { deletedAt?: string | null; deletedByName?: string | null; reason?: string | null } | null;
  availableActions?: string[];
}
export interface PlayerBookingRowDto {
  bookingId?: number;
  venueName?: string;
  date?: string | null;
  slotLabel?: string;
  amount?: number;
  status?: string;
}
export interface PlayerBookingPageDto {
  content?: PlayerBookingRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface PlayerPaymentRowDto {
  paymentId?: number;
  date?: string | null;
  amount?: number;
  methodLabel?: string;
  status?: string;
  refundedAmount?: number | null;
}
export interface PlayerPaymentPageDto {
  content?: PlayerPaymentRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface PlayerAuditRowDto {
  id?: number;
  actorName?: string | null;
  action?: string;
  reason?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdAt?: string | null;
}
export interface PlayerAuditPageDto {
  content?: PlayerAuditRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface PlayerSuspendBody { reason: string; until?: string | null }
export interface PlayerReasonBody { reason: string }
export interface PlayerVerificationBody { channel: 'EMAIL' | 'PHONE'; verified: boolean }
export interface PlayerMessageBody { channels: string[]; subject?: string | null; body: string }

export interface AdminVenueDetailDto {
  venue?: VenueDetailDto;
  owner?: AdminOwnerDto;
  ownerHistory?: OwnerVenueHistoryDto;
  intendedPlanCode?: string;
  commentHistory?: VenueApprovalComment[];
  approvalStatus?: string;
  listingStatus?: string;
  statusLabel?: string;
  statusTone?: string;
  availableActions?: string[];
  rejectionReason?: string | null;
  changeNotes?: string | null;
  submittedAt?: string | null;
  completeness?: VenueCompletenessDto;
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
  updatedAt?: string;
  groupId?: string;
  playerPhone?: string;    // exposed to venue owners only (server-enforced)
  venuePhone?: string;     // exposed to players (venue contact number)
  cancellationReason?: string; // PLAYER | OWNER | TIME_OVER — null when not cancelled
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
  venueId?: number;
  authorName?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;      // ISO date-time
  isOwn?: boolean;
  venueName?: string;      // populated on owner endpoint only
}

export interface CreateReviewRequest {
  venueId: number;
  rating: number;
  comment: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment: string;
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
  referenceId?: string;    // bookingId or groupId
  referenceType?: string;  // "BOOKING" | "BOOKING_GROUP"
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

// ─── Dashboard summary (single aggregated payload) ───────────────────────────

export type DashboardPeriodDto = 'TODAY' | 'WEEK' | 'MONTH';
export type DashboardToneDto = 'NEUTRAL' | 'DANGER';
export type TrendDirectionDto = 'UP' | 'DOWN' | 'FLAT';
export type NeedsAttentionKeyDto =
  | 'PENDING_APPROVALS'
  | 'SUBSCRIPTION_REQUESTS'
  | 'OPEN_DISPUTES'
  | 'EXPIRING_SUBSCRIPTIONS'
  | 'TRIALS_ENDING';

export interface CountMetricDto {
  value: number;
  trendPct?: number | null;
  trendDirection?: TrendDirectionDto | null;
}

export interface MoneyMetricDto {
  amount: number;
  trendPct?: number | null;
  trendDirection?: TrendDirectionDto | null;
}

export interface MrrMetricDto {
  amount: number;
  activeSubscriptions: number;
  trendPct?: number | null;
  trendDirection?: TrendDirectionDto | null;
}

export interface NeedsAttentionItemDto {
  key: NeedsAttentionKeyDto;
  label: string;
  count: number;
  tone: DashboardToneDto;
  deepLinkScreen: string;
  deepLinkParams?: Record<string, string> | null;
}

export interface ManagementCountsDto {
  venues?: number;
  players?: number;
  owners?: number;
  bookings?: number;
  openDisputes?: number;
  activeCoupons?: number;
}

export interface DashboardSummaryDto {
  asOf: string;
  period: DashboardPeriodDto;
  canViewFinancials: boolean;
  mrr?: MrrMetricDto | null;
  revenueThisPeriod?: MoneyMetricDto | null;
  gbvThisPeriod?: MoneyMetricDto | null;
  bookingsThisPeriod: CountMetricDto;
  newSignupsThisPeriod: CountMetricDto;
  activeVenues: CountMetricDto;
  pendingModeration: CountMetricDto;
  needsAttention: NeedsAttentionItemDto[];
  counts: ManagementCountsDto;
}

export interface OwnerStatsDto {
  todayBookings?: number;
  todayRevenue?: number;
  weekRevenue?: number;
  monthRevenue?: number;
  pendingPayout?: number;
}

// ─── Owner Dashboard Summary ─────────────────────────────────────────────────

export interface DashboardEarningsDto {
  todayAmount: number;
  weekAmount: number;
  monthAmount: number;
  pendingAmount: number;
  todayBookingCount: number;
}

export interface DashboardBookingCountsDto {
  requests: number;
  today: number;
  upcoming: number;
  completedLast30Days: number;
  cancelledLast30Days: number;
}

export interface DashboardStatsDto {
  usersConnected: number;
  venueCount: number;
  courtCount: number;
}

export interface DashboardSlotDto {
  id: number;
  courtName: string;
  startTime: string;    // "HH:mm"
  endTime: string;      // "HH:mm"
  playerName: string;
  sport: string;
  status: string;       // "confirmed" | "checked_in" | "completed"
}

export interface OwnerDashboardSummaryDto {
  earnings: DashboardEarningsDto;
  bookings: DashboardBookingCountsDto;
  stats: DashboardStatsDto;
  todaySlots: DashboardSlotDto[];
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

// ─── Subscriptions ─────────────────────────────────────────────────────────
// Response DTOs use plain strings for enum fields (matching the backend contract).

export type BillingCycle = 'MONTHLY' | 'ANNUAL';
export type SubscriptionStatusDto =
  'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED' | 'CANCELED' | 'VOIDED';

export interface SubscriptionPlanDto {
  id: number;
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

export interface SubscriptionDto {
  id: number;
  ownerId: number;
  venueId: number;
  planId: number;
  planCode: string;
  planName: string;
  billingCycle: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  trialEnd?: string | null;
  price: number;
  currency: string;
  maxCourts: number;
  coveredCourtIds?: string[];
  coveredCourtNames?: string[];
  features: string[];
  activationSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionChangeRequestDto {
  id: number;
  ownerId: number;
  ownerName?: string;
  ownerEmail?: string | null;
  venueId: number;
  venueName?: string;
  venueCity?: string | null;
  currentSubscriptionId?: number | null;
  currentPlanName?: string | null;
  requestedPlanId: number;
  requestedPlanCode: string;
  requestedPlanName: string;
  requestedPlanPrice?: number;
  requestedPlanMaxCourts?: number;
  requestedCycle: string;
  status: string;
  coveredCourtIds?: string[];
  coveredCourtNames?: string[];
  createdAt: string;
  decidedAt?: string | null;
  reason?: string;
}

export interface VenueSubscriptionViewDto {
  current?: SubscriptionDto | null;
  courtsUsed: number;
  courtsAllowed: number;
  history: SubscriptionDto[];
  pendingChangeRequest?: SubscriptionChangeRequestDto | null;
  venue?: SubscriptionVenueRefDto | null;
  owner?: SubscriptionOwnerRefDto | null;
  timeline?: SubscriptionTimelineDto | null;
}

export interface SubscriptionVenueRefDto {
  id: number;
  name: string;
  city?: string | null;
  courtCount: number;
  registeredAt?: string | null;
  approvedAt?: string | null;
}

export interface SubscriptionOwnerRefDto {
  id: number;
  name: string;
  mobile?: string | null;
  email?: string | null;
}

export type StageKeyDto = 'REGISTERED' | 'APPROVED' | 'TRIAL_ACTIVATED' | 'SUBSCRIPTION';
export type StageStateDto = 'COMPLETED' | 'LIVE' | 'PENDING';

export interface TimelineStageDto {
  key: StageKeyDto;
  label: string;
  occurredAt?: string | null;
  state: StageStateDto;
}

export interface SubscriptionTimelineDto {
  stages: TimelineStageDto[];
  liveStageKey?: StageKeyDto | null;
}

export interface VenueSubscriptionRowDto {
  venueId: number;
  venueName: string;
  venueCity?: string | null;
  ownerName: string;
  ownerMobile?: string | null;
  currentPlanCode?: string | null;
  currentPlanName?: string | null;
  currentStatus: string;
  endDate?: string | null;
  courtsUsed: number;
  courtLimit?: number | null;
  pendingRequestId?: number | null;
  pendingCurrentPlanName?: string | null;
  pendingRequestedPlanName?: string | null;
}

export interface VenueSubscriptionPageDto {
  content: VenueSubscriptionRowDto[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface SubscriptionCreateRequest {
  ownerId: number;
  venueId: number;
  planId: number;
  billingCycle: BillingCycle;
  asTrial?: boolean;
  paymentMethod?: 'CASH' | 'UPI_OFFLINE' | 'BANK_TRANSFER' | 'PROVIDER';
  paymentReference?: string;
  notes?: string;
}

export interface SubscriptionEditRequest {
  planId?: number;
  billingCycle?: BillingCycle;
  notes?: string;
}

export interface UpdatePlanRequest {
  name?: string;
  maxCourts?: number;
  priceMonthly?: number;
  priceAnnual?: number;
  features?: string[];
  photoLimit?: number;
  placementWeight?: number;
  trialDays?: number;
  active?: boolean;
  displayOrder?: number;
}

export interface UpgradeRequestCreate {
  requestedPlanId: number;
  billingCycle: BillingCycle;
}

export interface RejectChangeRequestBody {
  reason: string;
}

/** Optional admin overrides when activating a change request. Omit courtIds to keep the owner's selection. */
export interface ActivateChangeRequestBody {
  courtIds?: string[] | null;
}

// ─── Owner subscription purchase + court coverage ─────────────────────────────

export interface PlanOptionDto {
  code?: string;
  name?: string;
  kind?: string;            // TRIAL | PAID
  price?: number;
  courtLimit?: number;
  durationDays?: number;
  oncePerVenue?: boolean;
  available?: boolean;
  unavailableReason?: string | null;
}

export interface SelectableCourtDto {
  courtId?: string;
  name?: string;
  sport?: string | null;
  isActive?: boolean;
  isCovered?: boolean;
}

export interface PendingRequestRefDto {
  requestId?: string;
  planCode?: string;
  planName?: string | null;
  coveredCourtIds?: string[];
  coveredCourtNames?: string[];
  requestedAt?: string | null;
}

export interface VenueSubscriptionStateDto {
  venueId?: string;
  kind?: string | null;     // TRIAL | PAID
  planCode?: string | null;
  planName?: string | null;
  status?: string;          // TRIAL | ACTIVE | EXPIRED | CANCELED | NONE
  startDate?: string | null;
  endDate?: string | null;
  courtLimit?: number | null;
  coveredCourtIds?: string[];
  coveredCourtNames?: string[];
  updatedAt?: string | null;
  totalCourts?: number;
  bookableCourts?: number;
  trialUsed?: boolean;
  canStartTrial?: boolean;
  canPurchasePaid?: boolean;
  blockReason?: string;     // NONE | NO_COURTS
  pendingRequest?: PendingRequestRefDto | null;
}

export interface CourtSelectionBody {
  courtIds: string[];
}

export interface PaidRequestBody {
  planCode: string;         // STARTER | GROWTH | PRO | PRO_MAX
  courtIds: string[];
}

export interface SubscriptionRequestViewDto {
  requestId?: string;
  venueId?: string;
  planCode?: string;
  coveredCourtIds?: string[];
  status?: string;
  requestedAt?: string;
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

// ─── Admin Owners ───────────────────────────────────────────────────────────
// NB: OwnerStatsDto/OwnerStats already name the owner *dashboard* stats; the admin
// owner-management stats use the AdminOwnerStats* names to avoid a collision.
export interface AdminOwnerStatsDto {
  totalOwners?: number;
  newThisWeek?: number;
  activeOwners?: number;
  onboardingOwners?: number;
  flaggedCount?: number;
}
export interface OwnerRowDto {
  ownerId?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  riskLevel?: string;
  riskReason?: string | null;
  totalVenues?: number;
  liveVenues?: number;
  grossBookingValue?: number;
  rating?: number | null;
  lastActiveAt?: string | null;
  joinedAt?: string | null;
}
export interface OwnerPageDto {
  content?: OwnerRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface OwnerStatsBlockDto {
  totalVenues?: number;
  liveVenues?: number;
  grossBookingValue?: number;
  bookingCount?: number;
  rating?: number | null;
  ownerCancellationRatePct?: number;
  disputeCount?: number;
  refundRatePct?: number;
}
export interface OwnerAdminDetailDto {
  ownerId?: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  status?: string;
  riskLevel?: string;
  riskReason?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  stats?: OwnerStatsBlockDto;
  suspension?: { reason?: string | null; until?: string | null } | null;
  deletion?: {
    deletedAt?: string | null;
    deletedByName?: string | null;
    reason?: string | null;
    venuesArchived?: number | null;
    bookingsCancelled?: number | null;
    subscriptionsVoided?: number | null;
  } | null;
  availableActions?: string[];
}
export interface OwnerBookingRowDto {
  bookingId?: number;
  venueName?: string;
  playerName?: string;
  date?: string | null;
  slotLabel?: string;
  amount?: number;
  status?: string;
}
export interface OwnerBookingPageDto {
  content?: OwnerBookingRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface OwnerReasonBody { reason: string }
export interface OwnerSuspendBody { reason: string; until?: string | null }
export interface OwnerBanBody { reason: string; cancelUpcomingBookings?: boolean }
export interface OwnerVerificationBody { channel: 'EMAIL' | 'PHONE'; verified: boolean }
export interface OwnerMessageBody { channels: string[]; subject?: string | null; body: string }

// ─── Admin Disputes ─────────────────────────────────────────────────────────
// (legacy DisputeDto/DisputeStatus are the role-scoped raise flow; admin uses these)
export interface PartyMiniDto {
  id?: number;
  role?: string;
  name?: string;
  phoneVerified?: boolean;
  riskLevel?: string;
  priorDisputeCount?: number;
  rating?: number | null;
}
export interface DisputeRowDto {
  disputeId?: number;
  title?: string;
  category?: string;
  status?: string;
  priority?: string;
  bookingRef?: string | null;
  venueName?: string | null;
  playerName?: string;
  ownerName?: string;
  assignedToName?: string | null;
  waitingOn?: string;
  raisedAt?: string | null;
  isOverdue?: boolean;
}
export interface AdminDisputePageDto {
  content?: DisputeRowDto[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
}
export interface DisputeStatsDto {
  open?: number;
  needsInfo?: number;
  overdue?: number;
  resolvedThisWeek?: number;
  avgResolutionHours?: number;
}
export interface DisputeConversationItemDto {
  id?: number;
  senderRole?: string;
  senderName?: string;
  body?: string;
  attachments?: string[];
  createdAt?: string | null;
}
export interface DisputeInternalNoteDto {
  id?: number;
  authorName?: string;
  body?: string;
  createdAt?: string | null;
}
export interface DisputeTimelineItemDto {
  id?: number;
  action?: string;
  actorName?: string;
  summary?: string;
  createdAt?: string | null;
}
export interface DisputeResolutionDto {
  outcome?: string;
  atFault?: string;
  rulingNote?: string;
  recommendedRefundAmount?: number | null;
  consequenceTarget?: string | null;
  consequenceAction?: string;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
}
export interface DisputeBookingRefDto {
  bookingId?: number;
  ref?: string;
  venueName?: string;
  date?: string | null;
  slotLabel?: string;
  amount?: number;
  methodLabel?: string | null;
  status?: string;
}
export interface DisputeDetailDto {
  disputeId?: number;
  title?: string;
  category?: string;
  status?: string;
  priority?: string;
  raisedByRole?: string;
  raisedAt?: string | null;
  assignedToName?: string | null;
  waitingOn?: string;
  isOverdue?: boolean;
  slaHours?: number;
  booking?: DisputeBookingRefDto | null;
  player?: PartyMiniDto;
  owner?: PartyMiniDto;
  conversation?: DisputeConversationItemDto[];
  internalNotes?: DisputeInternalNoteDto[];
  timeline?: DisputeTimelineItemDto[];
  resolution?: DisputeResolutionDto | null;
  availableActions?: string[];
}
export interface DisputeResolveBody {
  outcome: string;
  atFault: string;
  rulingNote: string;
  recommendedRefundAmount?: number | null;
  consequence?: {
    target: 'PLAYER' | 'OWNER';
    action: 'NONE' | 'WARN' | 'FLAG' | 'SUSPEND' | 'BAN';
    reason: string;
    until?: string | null;
  } | null;
}
export interface DisputeReasonBody { reason: string }
export interface DisputeMessageBody { audience: 'PLAYER' | 'OWNER' | 'BOTH'; channels: string[]; body: string }
export interface DisputeRequestInfoBody { party: 'PLAYER' | 'OWNER'; message: string }
export interface DisputeNoteBody { body: string }
