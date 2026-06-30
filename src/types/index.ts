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

export type VenueStatus = 'draft' | 'live' | 'pending' | 'rejected' | 'suspended' | 'changes_requested' | 'archived';

export type SlotStatus = 'available' | 'booked' | 'blocked' | 'held';

export type PaymentStatus = 'success' | 'pending' | 'failed' | 'refunded';

export type DisputeStatus = 'open' | 'resolved';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  /** Admin sub-role (RBAC). Only present for admins; legacy admins resolve to 'SUPER_ADMIN'. */
  adminRole?: 'SUPER_ADMIN' | 'SUPPORT' | 'READ_ONLY';
  avatar?: string;
  preferredSports?: string[];
  totalBookings?: number;
  isPremium?: boolean;
  createdAt?: string;
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
  /** true = LIVE (player-bookable); false = LOCKED (exists, owner-only). Server-computed. */
  isLive: boolean;
  /** true = soft-deleted (kept in DB, admin-only view). Owners/players never receive these. */
  isDeleted: boolean;
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
  contactAvailable?: boolean; // venue has a contact number; true even for guests (no number leaked)
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
  isFavorite?: boolean;
  activeOfferLabel?: string; // best active owner-funded promo label, e.g. "10% off"
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

export type VenueStatusTone = 'GREEN' | 'AMBER' | 'BLUE' | 'RED' | 'GRAY';
export type VenueActionCode = 'APPROVE' | 'REJECT' | 'SEND_BACK' | 'RECONSIDER' | 'UNLIST' | 'RELIST' | 'EDIT';

export interface VenueCompletenessCheck {
  key: string;   // PHOTOS | COURT | ADDRESS | PHONE
  label: string;
  done: boolean;
}
export interface VenueCompleteness {
  percent: number;
  checks: VenueCompletenessCheck[];
}

export interface VenueCounts {
  all: number;
  pending: number;
  changesRequested: number;
  approved: number;
  rejected: number;
}

export interface AdminVenueDetail {
  venue: Venue;
  owner: AdminVenueOwner;
  ownerHistory: OwnerVenueHistory;
  intendedPlanCode: string | null;
  commentHistory: VenueApprovalComment[];
  approvalStatus: string;
  listingStatus: string;        // LIVE | UNLISTED | NONE
  statusLabel: string;
  statusTone: VenueStatusTone;
  availableActions: VenueActionCode[];
  rejectionReason?: string | null;
  changeNotes?: string | null;
  submittedAt?: string | null;
  completeness: VenueCompleteness;
}

// ─── Admin Players ────────────────────────────────────────────────────────
export type PlayerStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type PlayerActionCode =
  | 'SUSPEND' | 'REACTIVATE' | 'BAN' | 'UNBAN' | 'VERIFY' | 'UNVERIFY'
  | 'FORCE_LOGOUT' | 'RESET_PASSWORD' | 'MESSAGE' | 'DELETE';
export type MessageChannel = 'IN_APP' | 'EMAIL' | 'SMS';

export interface PlayerStats {
  totalPlayers: number;
  newThisWeek: number;
  activeRatePct: number;
  flaggedCount: number;
}

export interface PlayerRow {
  playerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: PlayerStatus;
  riskLevel: RiskLevel;
  riskReason?: string | null;
  bookingCount: number;
  totalSpend: number;
  lastActiveAt?: string | null;
  joinedAt?: string | null;
}

export interface PlayerStatsBlock {
  bookingCount: number;
  totalSpend: number;
  refundCount: number;
  refundTotal: number;
  reviewCount: number;
  cancellationRatePct: number;
  noShowCount: number;
}

export interface PlayerAdminDetail {
  playerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: PlayerStatus;
  riskLevel: RiskLevel;
  riskReason?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  stats: PlayerStatsBlock;
  suspension?: { reason?: string | null; until?: string | null } | null;
  deletion?: { deletedAt?: string | null; deletedByName?: string | null; reason?: string | null } | null;
  availableActions: PlayerActionCode[];
}

export interface PlayerBookingRow {
  bookingId: string;
  venueName: string;
  date?: string | null;
  slotLabel: string;
  amount: number;
  status: string;
}

export interface PlayerPaymentRow {
  paymentId: string;
  date?: string | null;
  amount: number;
  methodLabel: string;
  status: string;
  refundedAmount?: number | null;
}

export interface PlayerAuditRow {
  id: string;
  actorName?: string | null;
  action: string;
  reason?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  createdAt?: string | null;
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

// ─── Owner subscription purchase + court coverage ─────────────────────────────
export type PlanKind = 'TRIAL' | 'PAID';
/** The five subscription plans. Single shared union — keep in sync with the backend PlanCode enum. */
export type PlanCode = 'TRIAL' | 'STARTER' | 'GROWTH' | 'PRO' | 'PRO_MAX';
export type PlanOptionCode = PlanCode;
export type PaidPlanCode = 'STARTER' | 'GROWTH' | 'PRO' | 'PRO_MAX';
export type VenueSubState = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'NONE';

export interface PlanOption {
  code: PlanOptionCode;
  name: string;
  kind: PlanKind;
  price: number;
  courtLimit: number;
  durationDays: number;
  oncePerVenue: boolean;
  available: boolean;
  unavailableReason: string | null;
}

export interface SelectableCourt {
  courtId: string;
  name: string;
  sport: string | null;
  isActive: boolean;
  isCovered: boolean;
}

export interface VenueSubscriptionState {
  venueId: string;
  kind: PlanKind | null;
  planCode: string | null;
  planName: string | null;
  status: VenueSubState;
  startDate: string | null;
  endDate: string | null;
  courtLimit: number | null;
  coveredCourtIds: string[];
  coveredCourtNames: string[];
  updatedAt: string | null;
  totalCourts: number;
  bookableCourts: number;
  trialUsed: boolean;
  canStartTrial: boolean;
  canPurchasePaid: boolean;
  blockReason: 'NONE' | 'NO_COURTS';
  pendingRequest: {
    requestId: string;
    planCode: string;
    planName: string | null;
    coveredCourtIds: string[];
    coveredCourtNames: string[];
    requestedAt: string | null;
  } | null;
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
  coveredCourtIds: string[];
  coveredCourtNames: string[];
  features: string[];
  activationSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionChangeRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string | null;
  venueId: string;
  venueName: string;
  venueCity?: string | null;
  currentSubscriptionId?: string | null;
  currentPlanName?: string | null;
  requestedPlanId: string;
  requestedPlanCode: string;
  requestedPlanName: string;
  requestedPlanPrice: number;
  requestedPlanMaxCourts: number;
  requestedCycle: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  coveredCourtIds: string[];
  coveredCourtNames: string[];
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
  venue?: SubscriptionVenueRef | null;
  owner?: SubscriptionOwnerRef | null;
  timeline?: SubscriptionTimeline | null;
}

export interface SubscriptionVenueRef {
  id: string;
  name: string;
  city?: string | null;
  courtCount: number;
  registeredAt?: string | null;
  approvedAt?: string | null;
}

export interface SubscriptionOwnerRef {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
}

export type StageKey = 'REGISTERED' | 'APPROVED' | 'TRIAL_ACTIVATED' | 'SUBSCRIPTION';
export type StageState = 'COMPLETED' | 'LIVE' | 'PENDING';

export interface TimelineStage {
  key: StageKey;
  label: string;
  occurredAt?: string | null;
  state: StageState;
}

export interface SubscriptionTimeline {
  stages: TimelineStage[];
  liveStageKey?: StageKey | null;
}

/** Row-level status rollup for the admin venue-subscription table. */
export type VenueSubscriptionRowStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRING' | 'EXPIRED' | 'NONE';

export interface VenueSubscriptionRow {
  venueId: string;
  venueName: string;
  venueCity?: string | null;
  ownerName: string;
  ownerMobile?: string | null;
  currentPlanCode?: string | null;
  currentPlanName?: string | null;
  currentStatus: VenueSubscriptionRowStatus;
  endDate?: string | null;
  courtsUsed: number;
  courtLimit?: number | null;
  pendingRequestId?: string | null;
  pendingCurrentPlanName?: string | null;
  pendingRequestedPlanName?: string | null;
}

// ─── Admin Owners ───────────────────────────────────────────────────────────
// Reuses RiskLevel + MessageChannel from Admin Players. OwnerStatus mirrors PlayerStatus
// but is kept distinct so the two surfaces can diverge.
export type OwnerStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type OwnerActionCode =
  | 'SUSPEND' | 'REACTIVATE' | 'BAN' | 'UNBAN' | 'VERIFY' | 'UNVERIFY'
  | 'FORCE_LOGOUT' | 'RESET_PASSWORD' | 'MESSAGE' | 'DELETE';

export interface AdminOwnerStats {
  totalOwners: number;
  newThisWeek: number;
  activeOwners: number;
  onboardingOwners: number;
  flaggedCount: number;
}

export interface OwnerRow {
  ownerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: OwnerStatus;
  riskLevel: RiskLevel;
  riskReason?: string | null;
  totalVenues: number;
  liveVenues: number;
  grossBookingValue: number;
  rating?: number | null;
  lastActiveAt?: string | null;
  joinedAt?: string | null;
}

export interface OwnerStatsBlock {
  totalVenues: number;
  liveVenues: number;
  grossBookingValue: number;
  bookingCount: number;
  rating?: number | null;
  ownerCancellationRatePct: number;
  disputeCount: number;
  refundRatePct: number;
}

export interface OwnerAdminDetail {
  ownerId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: OwnerStatus;
  riskLevel: RiskLevel;
  riskReason?: string | null;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  stats: OwnerStatsBlock;
  suspension?: { reason?: string | null; until?: string | null } | null;
  deletion?: {
    deletedAt?: string | null;
    deletedByName?: string | null;
    reason?: string | null;
    venuesArchived?: number | null;
    bookingsCancelled?: number | null;
    subscriptionsVoided?: number | null;
  } | null;
  availableActions: OwnerActionCode[];
}

export interface OwnerBookingRow {
  bookingId: string;
  venueName: string;
  playerName: string;
  date?: string | null;
  slotLabel: string;
  amount: number;
  status: string;
}

// ─── Admin Disputes ───────────────────────────────────────────────────────────
// (legacy `Dispute`/`DisputeStatus` are the role-scoped raise flow; admin triage uses these)
export type AdminDisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'NEEDS_INFO' | 'RESOLVED' | 'DISMISSED';
export type DisputeCategory =
  | 'OWNER_NO_SHOW' | 'OWNER_CANCELLATION' | 'DOUBLE_BOOKING' | 'NOT_AS_DESCRIBED'
  | 'REFUND_NOT_GIVEN' | 'OVERCHARGED' | 'SAFETY_BEHAVIOR' | 'OTHER';
export type DisputePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type DisputeWaitingOn = 'PLAYER' | 'OWNER' | 'NONE';
export type DisputePartyRole = 'PLAYER' | 'OWNER';
export type MessageAudience = 'PLAYER' | 'OWNER' | 'BOTH';
export type ResolutionOutcome =
  | 'RULED_FOR_PLAYER' | 'RULED_FOR_OWNER' | 'PARTIAL' | 'RESOLVED_BY_PARTIES' | 'DISMISSED';
export type ConsequenceAction = 'NONE' | 'WARN' | 'FLAG' | 'SUSPEND' | 'BAN';
export type DisputeActionCode =
  | 'ASSIGN' | 'MESSAGE' | 'REQUEST_INFO' | 'ADD_NOTE' | 'RESOLVE' | 'DISMISS' | 'REOPEN' | 'APPLY_CONSEQUENCE';

export interface DisputePartyMini {
  id: string;
  role: DisputePartyRole;
  name: string;
  phoneVerified: boolean;
  riskLevel: RiskLevel;
  priorDisputeCount: number;
  rating?: number | null;
}

export interface AdminDisputeRow {
  disputeId: string;
  title: string;
  category: DisputeCategory;
  status: AdminDisputeStatus;
  priority: DisputePriority;
  bookingRef?: string | null;
  venueName?: string | null;
  playerName: string;
  ownerName: string;
  assignedToName?: string | null;
  waitingOn: DisputeWaitingOn;
  raisedAt?: string | null;
  isOverdue: boolean;
}

export interface AdminDisputeStats {
  open: number;
  needsInfo: number;
  overdue: number;
  resolvedThisWeek: number;
  avgResolutionHours: number;
}

export interface DisputeConversationItem {
  id: string;
  senderRole: 'PLAYER' | 'OWNER' | 'ADMIN';
  senderName: string;
  body: string;
  attachments: string[];
  createdAt?: string | null;
}
export interface DisputeInternalNote {
  id: string;
  authorName: string;
  body: string;
  createdAt?: string | null;
}
export interface DisputeTimelineItem {
  id: string;
  action: string;
  actorName: string;
  summary: string;
  createdAt?: string | null;
}
export interface DisputeResolutionView {
  outcome: ResolutionOutcome | null;
  atFault: DisputePartyRole | 'NONE';
  rulingNote: string;
  recommendedRefundAmount?: number | null;
  consequenceTarget?: DisputePartyRole | 'NONE' | null;
  consequenceAction: ConsequenceAction;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
}
export interface DisputeBooking {
  bookingId: string;
  ref: string;
  venueName: string;
  date?: string | null;
  slotLabel: string;
  amount: number;
  methodLabel?: string | null;
  status: string;
}

export interface AdminDisputeDetail {
  disputeId: string;
  title: string;
  category: DisputeCategory;
  status: AdminDisputeStatus;
  priority: DisputePriority;
  raisedByRole: DisputePartyRole;
  raisedAt?: string | null;
  assignedToName?: string | null;
  waitingOn: DisputeWaitingOn;
  isOverdue: boolean;
  slaHours: number;
  booking?: DisputeBooking | null;
  player: DisputePartyMini;
  owner: DisputePartyMini;
  conversation: DisputeConversationItem[];
  internalNotes: DisputeInternalNote[];
  timeline: DisputeTimelineItem[];
  resolution?: DisputeResolutionView | null;
  availableActions: DisputeActionCode[];
}

// ─── Admin Dashboard summary ───────────────────────────────────────────────
export type DashboardPeriod = 'TODAY' | 'WEEK' | 'MONTH';
export type DashboardTone = 'NEUTRAL' | 'DANGER';
export type TrendDirection = 'UP' | 'DOWN' | 'FLAT';
export type NeedsAttentionKey =
  | 'PENDING_APPROVALS'
  | 'SUBSCRIPTION_REQUESTS'
  | 'COURT_CHANGE_REQUESTS'
  | 'OPEN_DISPUTES'
  | 'EXPIRING_SUBSCRIPTIONS'
  | 'TRIALS_ENDING';

export interface CountMetric {
  value: number;
  trendPct: number | null;
  trendDirection: TrendDirection | null;
}

export interface MoneyMetric {
  amount: number;
  trendPct: number | null;
  trendDirection: TrendDirection | null;
}

export interface MrrMetric {
  amount: number;
  activeSubscriptions: number;
  trendPct: number | null;
  trendDirection: TrendDirection | null;
}

export interface NeedsAttentionItem {
  key: NeedsAttentionKey;
  label: string;
  count: number;
  tone: DashboardTone;
  deepLinkScreen: string;
  deepLinkParams: Record<string, string> | null;
}

export interface VenueStatusCounts {
  live: number;
  pending: number;
  changesRequested: number;
  rejected: number;
  suspended: number;
  draft: number;
  archived: number;
}

export interface ManagementCounts {
  venues: number;
  players: number;
  owners: number;
  bookings: number;
  openDisputes: number;
  activeCoupons: number;
  venuesByStatus: VenueStatusCounts;
}

export interface DashboardSummary {
  asOf: string;
  period: DashboardPeriod;
  canViewFinancials: boolean;
  mrr: MrrMetric | null;
  revenueThisPeriod: MoneyMetric | null;
  gbvThisPeriod: MoneyMetric | null;
  bookingsThisPeriod: CountMetric;
  newSignupsThisPeriod: CountMetric;
  activeVenues: CountMetric;
  pendingModeration: CountMetric;
  needsAttention: NeedsAttentionItem[];
  counts: ManagementCounts;
}
