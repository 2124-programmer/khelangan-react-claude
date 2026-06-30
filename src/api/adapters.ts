/**
 * Adapters convert backend DTOs (int64 IDs, uppercase enums) to frontend types
 * (string IDs, lowercase enums). Components and hooks consume frontend types only.
 */
import type {
  UserDto, SportDto, VenueSummaryDto, VenueDetailDto, CourtDto,
  SlotDto, BookingDto, ReviewDto, CouponDto, PayoutDto, DisputeDto,
  NotificationDto, AdminStatsDto, OwnerStatsDto, OwnerSettingsDto,
  AdminVenueDetailDto, VenueApprovalComment as VenueApprovalCommentDto,
  VenueCountsDto,
} from './types';
import type {
  User, Sport, Venue, VenueImage, Court, Slot, Booking, Review, Coupon,
  Payout, Dispute, AppNotification, UserRole, VenueStatus,
  SlotStatus, BookingStatus, PaymentStatus, OwnerSettings, CancellationReason,
  AdminVenueDetail, VenueApprovalComment, VenueSubscriptionBadge,
  VenueCounts, VenueStatusTone, VenueActionCode,
} from '../types';
import type {
  DashboardSummaryDto, CountMetricDto, MoneyMetricDto, MrrMetricDto, NeedsAttentionItemDto,
} from './types';
import type {
  DashboardSummary, CountMetric, MoneyMetric, MrrMetric, NeedsAttentionItem,
  DashboardPeriod, DashboardTone, TrendDirection, NeedsAttentionKey, ManagementCounts,
} from '../types';

function adaptSubscriptionBadge(dto: VenueSummaryDto['subscription']): VenueSubscriptionBadge | undefined {
  if (!dto) return undefined;
  return {
    planCode: dto.planCode ?? '',
    planName: dto.planName ?? '',
    status: dto.status ?? '',
    effectiveEnd: dto.effectiveEnd ?? null,
    remainingDays: dto.remainingDays ?? 0,
    expiringSoon: dto.expiringSoon ?? false,
  };
}

function adaptApprovalComment(dto: VenueApprovalCommentDto): VenueApprovalComment {
  return {
    id: String(dto.id ?? 0),
    action: dto.action ?? '',
    authorRole: dto.authorRole ?? '',
    comment: dto.comment ?? null,
    createdAt: dto.createdAt ?? null,
  };
}
import { BASE_URL } from './client';

// Rewrites the host in a stored image URL to match the current API base URL.
// This handles the case where images were uploaded when the server had a different
// IP (e.g. <ip address>:8080) but the frontend now connects via localhost:8080.
function normalizeImageUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const img = new URL(url);
    const api = new URL(BASE_URL);
    img.protocol = api.protocol;
    img.host = api.host;
    return img.toString();
  } catch {
    return url;
  }
}

export function adaptUser(dto: UserDto): User {
  return {
    id: String(dto.id ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    role: (dto.role?.toLowerCase() as UserRole) ?? 'player',
    adminRole: dto.adminRole ?? undefined,
    avatar: dto.avatarUrl,
    preferredSports: dto.preferredSports ?? [],
    totalBookings: dto.totalBookings ?? 0,
    isPremium: dto.isPremium ?? false,
    createdAt: dto.createdAt,
  };
}

export function adaptSport(dto: SportDto): Sport {
  return {
    id: String(dto.id ?? 0),
    name: dto.name ?? '',
    icon: dto.icon ?? '🎯',
  };
}

export function adaptCourt(dto: CourtDto): Court {
  return {
    id: String(dto.id ?? 0),
    name: dto.name ?? '',
    sportId: String(dto.sportId ?? 0),
    type: dto.type ?? '',
    pricePerHour: dto.pricePerHour ?? null,
    peakPrice: dto.peakPrice ?? 0,
    openTime: dto.openTime ?? null,
    closeTime: dto.closeTime ?? null,
    slotDurationMins: dto.slotDurationMins ?? 60,
    isActive: dto.isActive ?? true,
    isLive: dto.isLive ?? false,
    isDeleted: dto.isDeleted ?? false,
    effectivePricePerHour: dto.effectivePricePerHour ?? dto.pricePerHour ?? 0,
    effectiveOpenTime: dto.effectiveOpenTime ?? dto.openTime ?? '05:00',
    effectiveCloseTime: dto.effectiveCloseTime ?? dto.closeTime ?? '23:00',
  };
}

function buildImages(photos: string[] | undefined, coverPhoto: string | undefined): VenueImage[] {
  const allPhotos = photos?.length ? photos : (coverPhoto ? [coverPhoto] : []);
  return allPhotos.slice(0, 3).map((url, i) => ({
    url: normalizeImageUrl(url),
    order: i,
    isPrimary: i === 0,
  }));
}

export function adaptVenueSummary(dto: VenueSummaryDto): Venue {
  const rawPhotos = dto.coverPhoto ? [dto.coverPhoto] : [];
  const photos = rawPhotos.map(normalizeImageUrl);
  const coverPhoto = normalizeImageUrl(dto.coverPhoto);
  return {
    id: String(dto.id ?? 0),
    ownerId: String(dto.ownerId ?? 0),
    name: dto.name ?? '',
    address: dto.address ?? '',
    city: dto.city ?? '',
    state: dto.state ?? '',
    pincode: dto.pincode ?? '',
    description: '',
    contactPhone: '',
    openTime: dto.openTime ?? '05:00',
    closeTime: dto.closeTime ?? '23:00',
    status: (dto.status?.toLowerCase() as VenueStatus) ?? 'live',
    ratingAverage: dto.ratingAverage ?? null,
    ratingCount: dto.ratingCount ?? 0,
    distanceKm: 0,
    pricePerHour: dto.pricePerHour ?? 0,
    images: buildImages(photos, coverPhoto),
    photos,
    coverPhoto,
    sports: (dto.sports ?? []).map((s) => String(s.id ?? 0)),
    amenities: dto.amenities ?? [],
    courts: [],
    courtCount: dto.courtCount ?? 0,
    isActive: dto.isActive ?? true,
    lat: dto.lat ?? 0,
    lng: dto.lng ?? 0,
    isFavorite: dto.isFavorite ?? false,
    activeOfferLabel: dto.activeOffer?.label ?? undefined,
    submittedAt: dto.createdAt ?? undefined,
    subscriptionBadge: adaptSubscriptionBadge(dto.subscription),
  };
}

export function adaptVenueDetail(dto: VenueDetailDto): Venue {
  const rawPhotos = dto.photos?.length ? dto.photos : (dto.coverPhoto ? [dto.coverPhoto] : []);
  const photos = rawPhotos.map(normalizeImageUrl);
  const coverPhoto = normalizeImageUrl(dto.coverPhoto) || photos[0] || '';
  return {
    id: String(dto.id ?? 0),
    ownerId: String(dto.ownerId ?? 0),
    name: dto.name ?? '',
    address: dto.address ?? '',
    city: dto.city ?? '',
    state: dto.state ?? '',
    pincode: dto.pincode ?? '',
    description: dto.description ?? '',
    contactPhone: dto.contactPhone ?? '',
    contactAvailable: dto.contactAvailable ?? !!dto.contactPhone,
    contactEmail: dto.contactEmail ?? '',
    openTime: dto.openTime ?? '05:00',
    closeTime: dto.closeTime ?? '23:00',
    status: (dto.status?.toLowerCase() as VenueStatus) ?? 'live',
    ratingAverage: dto.ratingAverage ?? null,
    ratingCount: dto.ratingCount ?? 0,
    distanceKm: 0,
    pricePerHour: dto.pricePerHour ?? 0,
    images: buildImages(photos, coverPhoto),
    photos,
    coverPhoto,
    sports: (dto.sports ?? []).map((s) => String(s.id ?? 0)),
    amenities: dto.amenities ?? [],
    courts: (dto.courts ?? []).map(adaptCourt),
    courtCount: (dto.courts ?? []).length,
    isActive: dto.isActive ?? true,
    lat: dto.lat ?? 0,
    lng: dto.lng ?? 0,
    submittedAt: dto.createdAt ?? undefined,
    approvalComments: (dto.approvalComments ?? []).map(adaptApprovalComment),
  };
}

export function adaptAdminVenueDetail(dto: AdminVenueDetailDto): AdminVenueDetail {
  return {
    venue: adaptVenueDetail(dto.venue ?? {}),
    owner: {
      id: String(dto.owner?.id ?? 0),
      name: dto.owner?.name ?? '',
      phone: dto.owner?.phone ?? '',
      email: dto.owner?.email ?? '',
      registeredOn: dto.owner?.registeredOn ?? undefined,
    },
    ownerHistory: {
      totalVenues: dto.ownerHistory?.totalVenues ?? 0,
      liveVenues: dto.ownerHistory?.liveVenues ?? 0,
    },
    intendedPlanCode: dto.intendedPlanCode ?? null,
    commentHistory: (dto.commentHistory ?? []).map(adaptApprovalComment),
    approvalStatus: dto.approvalStatus ?? 'PENDING',
    listingStatus: dto.listingStatus ?? 'NONE',
    statusLabel: dto.statusLabel ?? '',
    statusTone: (dto.statusTone ?? 'GRAY') as VenueStatusTone,
    availableActions: (dto.availableActions ?? []) as VenueActionCode[],
    rejectionReason: dto.rejectionReason ?? null,
    changeNotes: dto.changeNotes ?? null,
    submittedAt: dto.submittedAt ?? null,
    completeness: {
      percent: dto.completeness?.percent ?? 0,
      checks: (dto.completeness?.checks ?? []).map((c) => ({
        key: c.key ?? '', label: c.label ?? '', done: !!c.done,
      })),
    },
  };
}

export function adaptVenueCounts(dto: VenueCountsDto): VenueCounts {
  return {
    all: dto.all ?? 0,
    pending: dto.pending ?? 0,
    changesRequested: dto.changesRequested ?? 0,
    approved: dto.approved ?? 0,
    rejected: dto.rejected ?? 0,
  };
}

// ─── Admin Players ────────────────────────────────────────────────────────
import type {
  PlayerStatsDto, PlayerRowDto, PlayerAdminDetailDto,
  PlayerBookingRowDto, PlayerPaymentRowDto, PlayerAuditRowDto,
} from './types';
import type {
  PlayerStats, PlayerRow, PlayerStatus, RiskLevel, PlayerAdminDetail, PlayerActionCode,
  PlayerBookingRow, PlayerPaymentRow, PlayerAuditRow,
} from '../types';

export function adaptPlayerStats(dto: PlayerStatsDto): PlayerStats {
  return {
    totalPlayers: dto.totalPlayers ?? 0,
    newThisWeek: dto.newThisWeek ?? 0,
    activeRatePct: dto.activeRatePct ?? 0,
    flaggedCount: dto.flaggedCount ?? 0,
  };
}

export function adaptPlayerRow(dto: PlayerRowDto): PlayerRow {
  return {
    playerId: String(dto.playerId ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    emailVerified: !!dto.emailVerified,
    phoneVerified: !!dto.phoneVerified,
    status: (dto.status ?? 'ACTIVE') as PlayerStatus,
    riskLevel: (dto.riskLevel ?? 'NONE') as RiskLevel,
    riskReason: dto.riskReason ?? null,
    bookingCount: dto.bookingCount ?? 0,
    totalSpend: dto.totalSpend ?? 0,
    lastActiveAt: dto.lastActiveAt ?? null,
    joinedAt: dto.joinedAt ?? null,
  };
}

export function adaptPlayerDetail(dto: PlayerAdminDetailDto): PlayerAdminDetail {
  return {
    playerId: String(dto.playerId ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    city: dto.city ?? null,
    emailVerified: !!dto.emailVerified,
    phoneVerified: !!dto.phoneVerified,
    status: (dto.status ?? 'ACTIVE') as PlayerStatus,
    riskLevel: (dto.riskLevel ?? 'NONE') as RiskLevel,
    riskReason: dto.riskReason ?? null,
    joinedAt: dto.joinedAt ?? null,
    lastActiveAt: dto.lastActiveAt ?? null,
    stats: {
      bookingCount: dto.stats?.bookingCount ?? 0,
      totalSpend: dto.stats?.totalSpend ?? 0,
      refundCount: dto.stats?.refundCount ?? 0,
      refundTotal: dto.stats?.refundTotal ?? 0,
      reviewCount: dto.stats?.reviewCount ?? 0,
      cancellationRatePct: dto.stats?.cancellationRatePct ?? 0,
      noShowCount: dto.stats?.noShowCount ?? 0,
    },
    suspension: dto.suspension ?? null,
    deletion: dto.deletion ?? null,
    availableActions: (dto.availableActions ?? []) as PlayerActionCode[],
  };
}

export function adaptPlayerBookingRow(dto: PlayerBookingRowDto): PlayerBookingRow {
  return {
    bookingId: String(dto.bookingId ?? 0),
    venueName: dto.venueName ?? '—',
    date: dto.date ?? null,
    slotLabel: dto.slotLabel ?? '',
    amount: dto.amount ?? 0,
    status: dto.status ?? '',
  };
}

export function adaptPlayerPaymentRow(dto: PlayerPaymentRowDto): PlayerPaymentRow {
  return {
    paymentId: String(dto.paymentId ?? 0),
    date: dto.date ?? null,
    amount: dto.amount ?? 0,
    methodLabel: dto.methodLabel ?? '—',
    status: dto.status ?? '',
    refundedAmount: dto.refundedAmount ?? null,
  };
}

export function adaptPlayerAuditRow(dto: PlayerAuditRowDto): PlayerAuditRow {
  return {
    id: String(dto.id ?? 0),
    actorName: dto.actorName ?? null,
    action: dto.action ?? '',
    reason: dto.reason ?? null,
    fromStatus: dto.fromStatus ?? null,
    toStatus: dto.toStatus ?? null,
    createdAt: dto.createdAt ?? null,
  };
}

export function adaptSlot(dto: SlotDto): Slot {
  return {
    // AVAILABLE slots have no DB id; use a composite key so React keys stay unique
    id: dto.id != null ? String(dto.id) : `${dto.courtId}_${dto.date}_${dto.startTime}`,
    courtId: String(dto.courtId ?? 0),
    date: dto.date ?? '',
    startTime: dto.startTime ?? '',
    endTime: dto.endTime ?? '',
    status: (dto.status?.toLowerCase() as SlotStatus) ?? 'available',
    price: dto.price ?? 0,
  };
}

export function adaptBooking(dto: BookingDto): Booking {
  const base = dto.amount ?? 0;
  const fee = dto.convenienceFee ?? 0;
  const discount = dto.discount ?? 0;
  return {
    id: String(dto.id ?? 0),
    playerId: String(dto.playerId ?? 0),
    playerName: dto.playerName ?? '',
    venueId: String(dto.venueId ?? 0),
    venueName: dto.venueName ?? '',
    venuePhoto: '',  // backend BookingDto has no photo; VenueDetail needed separately
    sport: dto.sport ?? '',
    courtName: dto.courtName ?? '',
    date: dto.date ?? '',
    startTime: dto.startTime ?? '',
    endTime: dto.endTime ?? '',
    amount: base + fee - discount,
    commission: dto.commission ?? 0,
    status: (dto.status?.toLowerCase() as BookingStatus) ?? 'pending',
    paymentStatus: (dto.paymentStatus?.toLowerCase() as PaymentStatus) ?? 'pending',
    hasReview: dto.hasReview ?? false,
    groupId: dto.groupId ?? undefined,
    playerPhone: dto.playerPhone,
    venuePhone: dto.venuePhone,
    cancellationReason: dto.cancellationReason
      ? (dto.cancellationReason.toLowerCase() as CancellationReason)
      : undefined,
    createdAt: dto.createdAt ?? undefined,
    updatedAt: dto.updatedAt ?? undefined,
  };
}

export function adaptReview(dto: ReviewDto): Review {
  return {
    id: String(dto.id ?? 0),
    venueId: String(dto.venueId ?? 0),
    authorName: dto.authorName ?? '',
    rating: dto.rating ?? 0,
    comment: dto.comment ?? '',
    createdAt: dto.createdAt ?? '',
    isOwn: dto.isOwn ?? false,
    venueName: dto.venueName,
  };
}

export function adaptCoupon(dto: CouponDto): Coupon {
  return {
    id: String(dto.id ?? 0),
    code: dto.code ?? '',
    discountType: (dto.discountType?.toLowerCase() as 'percent' | 'flat') ?? 'flat',
    discountValue: dto.discountValue ?? 0,
    minBooking: dto.minBooking ?? 0,
    maxDiscount: dto.maxDiscount,
    validUntil: dto.validUntil ?? '',
    usedCount: dto.usedCount ?? 0,
    maxUses: dto.maxUses ?? 0,
    isActive: dto.isActive ?? true,
  };
}

export function adaptPayout(dto: PayoutDto): Payout {
  return {
    id: String(dto.id ?? 0),
    ownerId: String(dto.ownerId ?? 0),
    ownerName: dto.ownerName ?? '',
    amount: dto.amount ?? 0,
    commissionDeducted: dto.commissionDeducted ?? 0,
    netAmount: dto.netAmount ?? 0,
    status: (dto.status?.toLowerCase() as Payout['status']) ?? 'pending',
    date: dto.date ?? dto.createdAt?.split('T')[0] ?? '',
  };
}

export function adaptDispute(dto: DisputeDto): Dispute {
  return {
    id: String(dto.id ?? 0),
    bookingId: String(dto.bookingId ?? 0),
    playerName: dto.playerName ?? '',
    ownerName: dto.ownerName ?? '',
    venueName: dto.venueName ?? '',
    issue: dto.issue ?? '',
    status: (dto.status?.toLowerCase() as 'open' | 'resolved') ?? 'open',
    date: dto.createdAt?.split('T')[0] ?? '',
  };
}

export function adaptNotification(dto: NotificationDto): AppNotification {
  const typeRaw = dto.type?.toLowerCase() ?? 'system';
  const validTypes = ['booking', 'payment', 'offer', 'review', 'system'] as const;
  const type = validTypes.includes(typeRaw as any) ? (typeRaw as AppNotification['type']) : 'system';
  return {
    id: String(dto.id ?? 0),
    title: dto.title ?? '',
    body: dto.body ?? '',
    type,
    date: dto.createdAt ?? '',
    isRead: dto.isRead ?? false,
    referenceId: dto.referenceId ?? undefined,
    referenceType: dto.referenceType ?? undefined,
  };
}

export function adaptAdminStats(dto: AdminStatsDto) {
  return {
    bookingsToday: dto.bookingsToday ?? 0,
    revenueToday: dto.revenueToday ?? 0,
    newUsers: dto.newUsers ?? 0,
    activeVenues: dto.activeVenues ?? 0,
    pendingApprovals: dto.pendingApprovals ?? 0,
    openDisputes: dto.openDisputes ?? 0,
  };
}

// ─── Dashboard summary ───────────────────────────────────────────────────────

function adaptCountMetric(dto: CountMetricDto | undefined): CountMetric {
  return {
    value: dto?.value ?? 0,
    trendPct: dto?.trendPct ?? null,
    trendDirection: (dto?.trendDirection ?? null) as TrendDirection | null,
  };
}

function adaptMoneyMetric(dto: MoneyMetricDto | null | undefined): MoneyMetric | null {
  if (!dto) return null;
  return {
    amount: dto.amount ?? 0,
    trendPct: dto.trendPct ?? null,
    trendDirection: (dto.trendDirection ?? null) as TrendDirection | null,
  };
}

function adaptMrrMetric(dto: MrrMetricDto | null | undefined): MrrMetric | null {
  if (!dto) return null;
  return {
    amount: dto.amount ?? 0,
    activeSubscriptions: dto.activeSubscriptions ?? 0,
    trendPct: dto.trendPct ?? null,
    trendDirection: (dto.trendDirection ?? null) as TrendDirection | null,
  };
}

function adaptNeedsAttentionItem(dto: NeedsAttentionItemDto): NeedsAttentionItem {
  return {
    key: dto.key as NeedsAttentionKey,
    label: dto.label ?? '',
    count: dto.count ?? 0,
    tone: (dto.tone ?? 'NEUTRAL') as DashboardTone,
    deepLinkScreen: dto.deepLinkScreen ?? '',
    deepLinkParams: dto.deepLinkParams ?? null,
  };
}

export function adaptDashboardSummary(dto: DashboardSummaryDto): DashboardSummary {
  const counts: ManagementCounts = {
    venues: dto.counts?.venues ?? 0,
    players: dto.counts?.players ?? 0,
    owners: dto.counts?.owners ?? 0,
    bookings: dto.counts?.bookings ?? 0,
    openDisputes: dto.counts?.openDisputes ?? 0,
    activeCoupons: dto.counts?.activeCoupons ?? 0,
  };
  return {
    asOf: dto.asOf,
    period: dto.period as DashboardPeriod,
    canViewFinancials: !!dto.canViewFinancials,
    mrr: adaptMrrMetric(dto.mrr),
    revenueThisPeriod: adaptMoneyMetric(dto.revenueThisPeriod),
    gbvThisPeriod: adaptMoneyMetric(dto.gbvThisPeriod),
    bookingsThisPeriod: adaptCountMetric(dto.bookingsThisPeriod),
    newSignupsThisPeriod: adaptCountMetric(dto.newSignupsThisPeriod),
    activeVenues: adaptCountMetric(dto.activeVenues),
    pendingModeration: adaptCountMetric(dto.pendingModeration),
    needsAttention: (dto.needsAttention ?? []).map(adaptNeedsAttentionItem),
    counts,
  };
}

export function adaptOwnerSettings(dto: OwnerSettingsDto): OwnerSettings {
  return {
    autoAcceptBookings: dto.autoAcceptBookings ?? false,
    pushNotificationsEnabled: dto.pushNotificationsEnabled ?? true,
  };
}

export function adaptOwnerStats(dto: OwnerStatsDto) {
  return {
    todayBookings: dto.todayBookings ?? 0,
    todayRevenue: dto.todayRevenue ?? 0,
    weekRevenue: dto.weekRevenue ?? 0,
    monthRevenue: dto.monthRevenue ?? 0,
    pendingPayout: dto.pendingPayout ?? 0,
  };
}

// ─── Subscriptions ─────────────────────────────────────────────────────────
import type {
  SubscriptionPlanDto, SubscriptionDto, SubscriptionChangeRequestDto,
  VenueSubscriptionViewDto, VenueSubscriptionRowDto, SubscriptionTimelineDto,
} from './types';
import type {
  SubscriptionPlan, Subscription, SubscriptionChangeRequest,
  VenueSubscriptionView, SubscriptionStatus,
  VenueSubscriptionRow, VenueSubscriptionRowStatus, SubscriptionTimeline,
} from '../types';

export function adaptSubscriptionPlan(dto: SubscriptionPlanDto): SubscriptionPlan {
  return {
    id: String(dto.id),
    code: dto.code,
    name: dto.name,
    maxCourts: dto.maxCourts,
    priceMonthly: dto.priceMonthly,
    priceAnnual: dto.priceAnnual,
    currency: dto.currency ?? 'INR',
    features: dto.features ?? [],
    photoLimit: dto.photoLimit,
    placementWeight: dto.placementWeight,
    trialDays: dto.trialDays,
    active: dto.active,
    displayOrder: dto.displayOrder,
  };
}

export function adaptSubscription(dto: SubscriptionDto): Subscription {
  return {
    id: String(dto.id),
    ownerId: String(dto.ownerId),
    venueId: String(dto.venueId),
    planId: String(dto.planId),
    planCode: dto.planCode,
    planName: dto.planName,
    billingCycle: dto.billingCycle,
    status: dto.status as SubscriptionStatus,
    periodStart: dto.periodStart,
    periodEnd: dto.periodEnd,
    trialEnd: dto.trialEnd ?? null,
    price: dto.price,
    currency: dto.currency ?? 'INR',
    maxCourts: dto.maxCourts,
    coveredCourtIds: (dto.coveredCourtIds ?? []).map(String),
    coveredCourtNames: dto.coveredCourtNames ?? [],
    features: dto.features ?? [],
    activationSource: dto.activationSource,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function adaptChangeRequest(dto: SubscriptionChangeRequestDto): SubscriptionChangeRequest {
  return {
    id: String(dto.id),
    ownerId: String(dto.ownerId),
    ownerName: dto.ownerName ?? '',
    ownerEmail: dto.ownerEmail ?? null,
    venueId: String(dto.venueId),
    venueName: dto.venueName ?? `Venue #${dto.venueId}`,
    venueCity: dto.venueCity ?? null,
    currentSubscriptionId: dto.currentSubscriptionId != null ? String(dto.currentSubscriptionId) : null,
    currentPlanName: dto.currentPlanName ?? null,
    requestedPlanId: String(dto.requestedPlanId),
    requestedPlanCode: dto.requestedPlanCode,
    requestedPlanName: dto.requestedPlanName,
    requestedPlanPrice: dto.requestedPlanPrice ?? 0,
    requestedPlanMaxCourts: dto.requestedPlanMaxCourts ?? 0,
    requestedCycle: dto.requestedCycle,
    status: dto.status as SubscriptionChangeRequest['status'],
    coveredCourtIds: (dto.coveredCourtIds ?? []).map(String),
    coveredCourtNames: dto.coveredCourtNames ?? [],
    createdAt: dto.createdAt,
    decidedAt: dto.decidedAt ?? null,
    reason: dto.reason,
  };
}

function adaptTimeline(dto: SubscriptionTimelineDto): SubscriptionTimeline {
  return {
    stages: (dto.stages ?? []).map((s) => ({
      key: s.key,
      label: s.label,
      occurredAt: s.occurredAt ?? null,
      state: s.state,
    })),
    liveStageKey: dto.liveStageKey ?? null,
  };
}

export function adaptVenueSubscriptionView(dto: VenueSubscriptionViewDto): VenueSubscriptionView {
  return {
    current: dto.current ? adaptSubscription(dto.current) : null,
    courtsUsed: dto.courtsUsed ?? 0,
    courtsAllowed: dto.courtsAllowed ?? 0,
    history: (dto.history ?? []).map(adaptSubscription),
    pendingChangeRequest: dto.pendingChangeRequest ? adaptChangeRequest(dto.pendingChangeRequest) : null,
    venue: dto.venue
      ? {
          id: String(dto.venue.id),
          name: dto.venue.name,
          city: dto.venue.city ?? null,
          courtCount: dto.venue.courtCount ?? 0,
          registeredAt: dto.venue.registeredAt ?? null,
          approvedAt: dto.venue.approvedAt ?? null,
        }
      : null,
    owner: dto.owner
      ? {
          id: String(dto.owner.id),
          name: dto.owner.name,
          mobile: dto.owner.mobile ?? null,
          email: dto.owner.email ?? null,
        }
      : null,
    timeline: dto.timeline ? adaptTimeline(dto.timeline) : null,
  };
}

export function adaptVenueSubscriptionRow(dto: VenueSubscriptionRowDto): VenueSubscriptionRow {
  return {
    venueId: String(dto.venueId),
    venueName: dto.venueName,
    venueCity: dto.venueCity ?? null,
    ownerName: dto.ownerName ?? '',
    ownerMobile: dto.ownerMobile ?? null,
    currentPlanCode: dto.currentPlanCode ?? null,
    currentPlanName: dto.currentPlanName ?? null,
    currentStatus: (dto.currentStatus ?? 'NONE') as VenueSubscriptionRowStatus,
    endDate: dto.endDate ?? null,
    courtsUsed: dto.courtsUsed ?? 0,
    courtLimit: dto.courtLimit ?? null,
    pendingRequestId: dto.pendingRequestId != null ? String(dto.pendingRequestId) : null,
    pendingCurrentPlanName: dto.pendingCurrentPlanName ?? null,
    pendingRequestedPlanName: dto.pendingRequestedPlanName ?? null,
  };
}

// ─── Admin Owners ────────────────────────────────────────────────────────────
import type {
  AdminOwnerStatsDto, OwnerRowDto, OwnerAdminDetailDto, OwnerBookingRowDto,
} from './types';
import type {
  AdminOwnerStats, OwnerRow, OwnerAdminDetail, OwnerBookingRow,
  OwnerStatus, OwnerActionCode, RiskLevel as OwnerRiskLevel,
} from '../types';

export function adaptAdminOwnerStats(dto: AdminOwnerStatsDto): AdminOwnerStats {
  return {
    totalOwners: dto.totalOwners ?? 0,
    newThisWeek: dto.newThisWeek ?? 0,
    activeOwners: dto.activeOwners ?? 0,
    onboardingOwners: dto.onboardingOwners ?? 0,
    flaggedCount: dto.flaggedCount ?? 0,
  };
}

export function adaptOwnerRow(dto: OwnerRowDto): OwnerRow {
  return {
    ownerId: String(dto.ownerId ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    emailVerified: !!dto.emailVerified,
    phoneVerified: !!dto.phoneVerified,
    status: (dto.status ?? 'ACTIVE') as OwnerStatus,
    riskLevel: (dto.riskLevel ?? 'NONE') as OwnerRiskLevel,
    riskReason: dto.riskReason ?? null,
    totalVenues: dto.totalVenues ?? 0,
    liveVenues: dto.liveVenues ?? 0,
    grossBookingValue: dto.grossBookingValue ?? 0,
    rating: dto.rating ?? null,
    lastActiveAt: dto.lastActiveAt ?? null,
    joinedAt: dto.joinedAt ?? null,
  };
}

export function adaptOwnerDetail(dto: OwnerAdminDetailDto): OwnerAdminDetail {
  return {
    ownerId: String(dto.ownerId ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    city: dto.city ?? null,
    emailVerified: !!dto.emailVerified,
    phoneVerified: !!dto.phoneVerified,
    status: (dto.status ?? 'ACTIVE') as OwnerStatus,
    riskLevel: (dto.riskLevel ?? 'NONE') as OwnerRiskLevel,
    riskReason: dto.riskReason ?? null,
    joinedAt: dto.joinedAt ?? null,
    lastActiveAt: dto.lastActiveAt ?? null,
    stats: {
      totalVenues: dto.stats?.totalVenues ?? 0,
      liveVenues: dto.stats?.liveVenues ?? 0,
      grossBookingValue: dto.stats?.grossBookingValue ?? 0,
      bookingCount: dto.stats?.bookingCount ?? 0,
      rating: dto.stats?.rating ?? null,
      ownerCancellationRatePct: dto.stats?.ownerCancellationRatePct ?? 0,
      disputeCount: dto.stats?.disputeCount ?? 0,
      refundRatePct: dto.stats?.refundRatePct ?? 0,
    },
    suspension: dto.suspension ?? null,
    deletion: dto.deletion ?? null,
    availableActions: (dto.availableActions ?? []) as OwnerActionCode[],
  };
}

export function adaptOwnerBookingRow(dto: OwnerBookingRowDto): OwnerBookingRow {
  return {
    bookingId: String(dto.bookingId ?? 0),
    venueName: dto.venueName ?? '—',
    playerName: dto.playerName ?? '—',
    date: dto.date ?? null,
    slotLabel: dto.slotLabel ?? '',
    amount: dto.amount ?? 0,
    status: dto.status ?? '',
  };
}

// ─── Admin Disputes ──────────────────────────────────────────────────────────
import type {
  DisputeRowDto, DisputeStatsDto, DisputeDetailDto, PartyMiniDto,
  DisputeConversationItemDto, DisputeInternalNoteDto, DisputeTimelineItemDto, DisputeResolutionDto,
} from './types';
import type {
  AdminDisputeRow, AdminDisputeStats, AdminDisputeDetail, DisputePartyMini,
  AdminDisputeStatus, DisputeCategory, DisputePriority, DisputeWaitingOn, DisputePartyRole,
  ResolutionOutcome, ConsequenceAction, DisputeActionCode,
  DisputeConversationItem, DisputeInternalNote, DisputeTimelineItem, DisputeResolutionView,
  RiskLevel as DisputeRiskLevel,
} from '../types';

export function adaptAdminDisputeStats(dto: DisputeStatsDto): AdminDisputeStats {
  return {
    open: dto.open ?? 0,
    needsInfo: dto.needsInfo ?? 0,
    overdue: dto.overdue ?? 0,
    resolvedThisWeek: dto.resolvedThisWeek ?? 0,
    avgResolutionHours: dto.avgResolutionHours ?? 0,
  };
}

export function adaptAdminDisputeRow(dto: DisputeRowDto): AdminDisputeRow {
  return {
    disputeId: String(dto.disputeId ?? 0),
    title: dto.title ?? '',
    category: (dto.category ?? 'OTHER') as DisputeCategory,
    status: (dto.status ?? 'OPEN') as AdminDisputeStatus,
    priority: (dto.priority ?? 'MEDIUM') as DisputePriority,
    bookingRef: dto.bookingRef ?? null,
    venueName: dto.venueName ?? null,
    playerName: dto.playerName ?? '—',
    ownerName: dto.ownerName ?? '—',
    assignedToName: dto.assignedToName ?? null,
    waitingOn: (dto.waitingOn ?? 'NONE') as DisputeWaitingOn,
    raisedAt: dto.raisedAt ?? null,
    isOverdue: !!dto.isOverdue,
  };
}

function adaptPartyMini(dto: PartyMiniDto | undefined, role: DisputePartyRole): DisputePartyMini {
  return {
    id: String(dto?.id ?? 0),
    role: (dto?.role as DisputePartyRole) ?? role,
    name: dto?.name ?? '—',
    phoneVerified: !!dto?.phoneVerified,
    riskLevel: (dto?.riskLevel ?? 'NONE') as DisputeRiskLevel,
    priorDisputeCount: dto?.priorDisputeCount ?? 0,
    rating: dto?.rating ?? null,
  };
}

function adaptResolution(dto: DisputeResolutionDto | null | undefined): DisputeResolutionView | null {
  if (!dto) return null;
  return {
    outcome: (dto.outcome ?? null) as ResolutionOutcome | null,
    atFault: (dto.atFault ?? 'NONE') as DisputePartyRole | 'NONE',
    rulingNote: dto.rulingNote ?? '',
    recommendedRefundAmount: dto.recommendedRefundAmount ?? null,
    consequenceTarget: (dto.consequenceTarget ?? null) as DisputePartyRole | 'NONE' | null,
    consequenceAction: (dto.consequenceAction ?? 'NONE') as ConsequenceAction,
    resolvedByName: dto.resolvedByName ?? null,
    resolvedAt: dto.resolvedAt ?? null,
  };
}

function adaptConversationItem(dto: DisputeConversationItemDto): DisputeConversationItem {
  return {
    id: String(dto.id ?? 0),
    senderRole: (dto.senderRole ?? 'ADMIN') as DisputeConversationItem['senderRole'],
    senderName: dto.senderName ?? '—',
    body: dto.body ?? '',
    attachments: dto.attachments ?? [],
    createdAt: dto.createdAt ?? null,
  };
}

export function adaptAdminDisputeDetail(dto: DisputeDetailDto): AdminDisputeDetail {
  return {
    disputeId: String(dto.disputeId ?? 0),
    title: dto.title ?? '',
    category: (dto.category ?? 'OTHER') as DisputeCategory,
    status: (dto.status ?? 'OPEN') as AdminDisputeStatus,
    priority: (dto.priority ?? 'MEDIUM') as DisputePriority,
    raisedByRole: (dto.raisedByRole ?? 'PLAYER') as DisputePartyRole,
    raisedAt: dto.raisedAt ?? null,
    assignedToName: dto.assignedToName ?? null,
    waitingOn: (dto.waitingOn ?? 'NONE') as DisputeWaitingOn,
    isOverdue: !!dto.isOverdue,
    slaHours: dto.slaHours ?? 48,
    booking: dto.booking
      ? {
          bookingId: String(dto.booking.bookingId ?? 0),
          ref: dto.booking.ref ?? '',
          venueName: dto.booking.venueName ?? '—',
          date: dto.booking.date ?? null,
          slotLabel: dto.booking.slotLabel ?? '',
          amount: dto.booking.amount ?? 0,
          methodLabel: dto.booking.methodLabel ?? null,
          status: dto.booking.status ?? '',
        }
      : null,
    player: adaptPartyMini(dto.player, 'PLAYER'),
    owner: adaptPartyMini(dto.owner, 'OWNER'),
    conversation: (dto.conversation ?? []).map(adaptConversationItem),
    internalNotes: (dto.internalNotes ?? []).map((n: DisputeInternalNoteDto): DisputeInternalNote => ({
      id: String(n.id ?? 0), authorName: n.authorName ?? '—', body: n.body ?? '', createdAt: n.createdAt ?? null,
    })),
    timeline: (dto.timeline ?? []).map((t: DisputeTimelineItemDto): DisputeTimelineItem => ({
      id: String(t.id ?? 0), action: t.action ?? '', actorName: t.actorName ?? '—',
      summary: t.summary ?? '', createdAt: t.createdAt ?? null,
    })),
    resolution: adaptResolution(dto.resolution),
    availableActions: (dto.availableActions ?? []) as DisputeActionCode[],
  };
}

// ─── Owner subscription purchase + court coverage ────────────────────────────
import type {
  PlanOptionDto, SelectableCourtDto, VenueSubscriptionStateDto,
} from './types';
import type {
  PlanOption, PlanOptionCode, PlanKind, SelectableCourt,
  VenueSubscriptionState, VenueSubState,
} from '../types';

export function adaptPlanOption(dto: PlanOptionDto): PlanOption {
  return {
    code: (dto.code ?? 'STARTER') as PlanOptionCode,
    name: dto.name ?? '',
    kind: (dto.kind ?? 'PAID') as PlanKind,
    price: dto.price ?? 0,
    courtLimit: dto.courtLimit ?? 0,
    durationDays: dto.durationDays ?? 30,
    oncePerVenue: dto.oncePerVenue ?? false,
    available: dto.available ?? false,
    unavailableReason: dto.unavailableReason ?? null,
  };
}

export function adaptSelectableCourt(dto: SelectableCourtDto): SelectableCourt {
  return {
    courtId: String(dto.courtId ?? ''),
    name: dto.name ?? '',
    sport: dto.sport ?? null,
    isActive: dto.isActive ?? false,
    isCovered: dto.isCovered ?? false,
  };
}

export function adaptVenueSubscriptionState(dto: VenueSubscriptionStateDto): VenueSubscriptionState {
  return {
    venueId: String(dto.venueId ?? ''),
    kind: (dto.kind ?? null) as PlanKind | null,
    planCode: dto.planCode ?? null,
    planName: dto.planName ?? null,
    status: (dto.status ?? 'NONE') as VenueSubState,
    startDate: dto.startDate ?? null,
    endDate: dto.endDate ?? null,
    courtLimit: dto.courtLimit ?? null,
    coveredCourtIds: (dto.coveredCourtIds ?? []).map(String),
    coveredCourtNames: dto.coveredCourtNames ?? [],
    updatedAt: dto.updatedAt ?? null,
    totalCourts: dto.totalCourts ?? 0,
    bookableCourts: dto.bookableCourts ?? 0,
    trialUsed: dto.trialUsed ?? false,
    canStartTrial: dto.canStartTrial ?? false,
    canPurchasePaid: dto.canPurchasePaid ?? false,
    blockReason: (dto.blockReason === 'NO_COURTS' ? 'NO_COURTS' : 'NONE'),
    pendingRequest: dto.pendingRequest
      ? {
          requestId: String(dto.pendingRequest.requestId ?? ''),
          planCode: dto.pendingRequest.planCode ?? '',
          planName: dto.pendingRequest.planName ?? null,
          coveredCourtIds: (dto.pendingRequest.coveredCourtIds ?? []).map(String),
          coveredCourtNames: dto.pendingRequest.coveredCourtNames ?? [],
          requestedAt: dto.pendingRequest.requestedAt ?? null,
        }
      : null,
  };
}
