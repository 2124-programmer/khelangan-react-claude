/**
 * Adapters convert backend DTOs (int64 IDs, uppercase enums) to frontend types
 * (string IDs, lowercase enums). Components and hooks consume frontend types only.
 */
import type {
  UserDto, SportDto, VenueSummaryDto, VenueDetailDto, CourtDto,
  SlotDto, BookingDto, ReviewDto, CouponDto, PayoutDto, DisputeDto,
  NotificationDto, AdminStatsDto, OwnerStatsDto, OwnerSettingsDto,
} from './types';
import type {
  User, Sport, Venue, VenueImage, Court, Slot, Booking, Review, Coupon,
  Payout, Dispute, AppNotification, UserRole, VenueStatus,
  SlotStatus, BookingStatus, PaymentStatus, OwnerSettings,
} from '../types';

export function adaptUser(dto: UserDto): User {
  return {
    id: String(dto.id ?? 0),
    name: dto.name ?? '',
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    role: (dto.role?.toLowerCase() as UserRole) ?? 'player',
    avatar: dto.avatarUrl,
    preferredSports: dto.preferredSports ?? [],
    totalBookings: dto.totalBookings ?? 0,
    isPremium: dto.isPremium ?? false,
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
    effectivePricePerHour: dto.effectivePricePerHour ?? dto.pricePerHour ?? 0,
    effectiveOpenTime: dto.effectiveOpenTime ?? dto.openTime ?? '05:00',
    effectiveCloseTime: dto.effectiveCloseTime ?? dto.closeTime ?? '23:00',
  };
}

function buildImages(photos: string[] | undefined, coverPhoto: string | undefined): VenueImage[] {
  const allPhotos = photos?.length ? photos : (coverPhoto ? [coverPhoto] : []);
  return allPhotos.slice(0, 3).map((url, i) => ({
    url,
    order: i,
    isPrimary: i === 0,
  }));
}

export function adaptVenueSummary(dto: VenueSummaryDto): Venue {
  const photos = dto.coverPhoto ? [dto.coverPhoto] : [];
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
    contactEmail: '',
    openTime: dto.openTime ?? '05:00',
    closeTime: dto.closeTime ?? '23:00',
    status: (dto.status?.toLowerCase() as VenueStatus) ?? 'live',
    rating: dto.rating ?? 0,
    reviewCount: dto.reviewCount ?? 0,
    distanceKm: 0,
    pricePerHour: dto.pricePerHour ?? 0,
    images: buildImages(photos, dto.coverPhoto),
    photos,
    coverPhoto: dto.coverPhoto ?? '',
    sports: [],   // not in summary; available in VenueDetailDto
    amenities: [],
    courts: [],
    isActive: dto.isActive ?? true,
    lat: dto.lat ?? 0,
    lng: dto.lng ?? 0,
  };
}

export function adaptVenueDetail(dto: VenueDetailDto): Venue {
  const photos = dto.photos?.length ? dto.photos : (dto.coverPhoto ? [dto.coverPhoto] : []);
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
    contactEmail: dto.contactEmail ?? '',
    openTime: dto.openTime ?? '05:00',
    closeTime: dto.closeTime ?? '23:00',
    status: (dto.status?.toLowerCase() as VenueStatus) ?? 'live',
    rating: dto.rating ?? 0,
    reviewCount: dto.reviewCount ?? 0,
    distanceKm: 0,
    pricePerHour: dto.pricePerHour ?? 0,
    images: buildImages(photos, dto.coverPhoto),
    photos,
    coverPhoto: dto.coverPhoto ?? '',
    sports: (dto.sports ?? []).map((s) => String(s.id ?? 0)),
    amenities: dto.amenities ?? [],
    courts: (dto.courts ?? []).map(adaptCourt),
    isActive: dto.isActive ?? true,
    lat: dto.lat ?? 0,
    lng: dto.lng ?? 0,
  };
}

export function adaptSlot(dto: SlotDto): Slot {
  return {
    id: String(dto.id ?? 0),
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
  };
}

export function adaptReview(dto: ReviewDto): Review {
  return {
    id: String(dto.id ?? 0),
    bookingId: String(dto.bookingId ?? 0),
    playerName: dto.playerName ?? '',
    venueId: String(dto.venueId ?? 0),
    rating: dto.rating ?? 0,
    comment: dto.comment ?? '',
    cleanliness: dto.cleanliness ?? 0,
    ground: dto.ground ?? 0,
    staff: dto.staff ?? 0,
    ownerReply: dto.ownerReply,
    date: dto.createdAt?.split('T')[0] ?? '',
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
