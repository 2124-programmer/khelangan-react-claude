import { apiClient } from '../client';
import type { Page } from '../types';
import type {
  AdminOwnerStatsDto, OwnerPageDto, OwnerAdminDetailDto,
  OwnerBookingPageDto, VenueSummaryDto, VenueSubscriptionRowDto,
  PlayerAuditPageDto,
  OwnerReasonBody, OwnerSuspendBody, OwnerBanBody, OwnerVerificationBody, OwnerMessageBody,
} from '../types';

const BASE = '/api/v1/admin/owners';

export const ownerService = {
  list: (params?: { q?: string; segment?: string; sort?: string; page?: number; size?: number }) =>
    apiClient.get<OwnerPageDto>(BASE, { params }).then((r) => r.data),

  stats: () => apiClient.get<AdminOwnerStatsDto>(`${BASE}/stats`).then((r) => r.data),

  detail: (id: number) => apiClient.get<OwnerAdminDetailDto>(`${BASE}/${id}`).then((r) => r.data),

  venues: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<Page<VenueSummaryDto>>(`${BASE}/${id}/venues`, { params }).then((r) => r.data),
  subscriptions: (id: number) =>
    apiClient.get<VenueSubscriptionRowDto[]>(`${BASE}/${id}/subscriptions`).then((r) => r.data),
  bookings: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<OwnerBookingPageDto>(`${BASE}/${id}/bookings`, { params }).then((r) => r.data),
  audit: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<PlayerAuditPageDto>(`${BASE}/${id}/audit`, { params }).then((r) => r.data),

  suspend: (id: number, body: OwnerSuspendBody) =>
    apiClient.post<OwnerAdminDetailDto>(`${BASE}/${id}/suspend`, body).then((r) => r.data),
  reactivate: (id: number) =>
    apiClient.post<OwnerAdminDetailDto>(`${BASE}/${id}/reactivate`).then((r) => r.data),
  ban: (id: number, body: OwnerBanBody) =>
    apiClient.post<OwnerAdminDetailDto>(`${BASE}/${id}/ban`, body).then((r) => r.data),
  unban: (id: number) =>
    apiClient.post<OwnerAdminDetailDto>(`${BASE}/${id}/unban`).then((r) => r.data),
  verification: (id: number, body: OwnerVerificationBody) =>
    apiClient.post<OwnerAdminDetailDto>(`${BASE}/${id}/verification`, body).then((r) => r.data),
  forceLogout: (id: number) =>
    apiClient.post<void>(`${BASE}/${id}/force-logout`).then((r) => r.data),
  resetPassword: (id: number) =>
    apiClient.post<void>(`${BASE}/${id}/reset-password`).then((r) => r.data),
  message: (id: number, body: OwnerMessageBody) =>
    apiClient.post<void>(`${BASE}/${id}/message`, body).then((r) => r.data),
  remove: (id: number, body: OwnerReasonBody) =>
    apiClient.delete<OwnerAdminDetailDto>(`${BASE}/${id}`, { data: body }).then((r) => r.data),
};
