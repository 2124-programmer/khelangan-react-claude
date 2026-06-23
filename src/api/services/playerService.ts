import { apiClient } from '../client';
import type {
  PlayerPageDto, PlayerStatsDto, PlayerAdminDetailDto,
  PlayerBookingPageDto, PlayerPaymentPageDto, PlayerAuditPageDto,
  PlayerSuspendBody, PlayerReasonBody, PlayerVerificationBody, PlayerMessageBody,
} from '../types';

const BASE = '/api/v1/admin/players';

export const playerService = {
  list: (params?: { q?: string; segment?: string; sort?: string; page?: number; size?: number }) =>
    apiClient.get<PlayerPageDto>(BASE, { params }).then((r) => r.data),

  stats: () => apiClient.get<PlayerStatsDto>(`${BASE}/stats`).then((r) => r.data),

  detail: (id: number) => apiClient.get<PlayerAdminDetailDto>(`${BASE}/${id}`).then((r) => r.data),

  suspend: (id: number, body: PlayerSuspendBody) =>
    apiClient.post<PlayerAdminDetailDto>(`${BASE}/${id}/suspend`, body).then((r) => r.data),
  reactivate: (id: number) =>
    apiClient.post<PlayerAdminDetailDto>(`${BASE}/${id}/reactivate`).then((r) => r.data),
  ban: (id: number, body: PlayerReasonBody) =>
    apiClient.post<PlayerAdminDetailDto>(`${BASE}/${id}/ban`, body).then((r) => r.data),
  unban: (id: number) =>
    apiClient.post<PlayerAdminDetailDto>(`${BASE}/${id}/unban`).then((r) => r.data),
  verification: (id: number, body: PlayerVerificationBody) =>
    apiClient.post<PlayerAdminDetailDto>(`${BASE}/${id}/verification`, body).then((r) => r.data),
  forceLogout: (id: number) =>
    apiClient.post<void>(`${BASE}/${id}/force-logout`).then((r) => r.data),
  resetPassword: (id: number) =>
    apiClient.post<void>(`${BASE}/${id}/reset-password`).then((r) => r.data),
  message: (id: number, body: PlayerMessageBody) =>
    apiClient.post<void>(`${BASE}/${id}/message`, body).then((r) => r.data),

  bookings: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<PlayerBookingPageDto>(`${BASE}/${id}/bookings`, { params }).then((r) => r.data),
  payments: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<PlayerPaymentPageDto>(`${BASE}/${id}/payments`, { params }).then((r) => r.data),
  audit: (id: number, params?: { page?: number; size?: number }) =>
    apiClient.get<PlayerAuditPageDto>(`${BASE}/${id}/audit`, { params }).then((r) => r.data),
};
