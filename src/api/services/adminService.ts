import { apiClient } from '../client';
import type {
  AdminStatsDto, OwnerStatsDto, PlatformSettingsDto, UpdateSettingsRequest,
  DashboardSummaryDto, DashboardPeriodDto,
  AdminSummary, AdminRoleValue, MessageResponse, SystemInfo,
} from '../types';

export const adminService = {
  getStats: () =>
    apiClient.get<AdminStatsDto>('/api/v1/admin/stats').then((r) => r.data),

  getDashboardSummary: (period: DashboardPeriodDto) =>
    apiClient
      .get<DashboardSummaryDto>('/api/v1/admin/dashboard/summary', { params: { period } })
      .then((r) => r.data),

  getOwnerStats: () =>
    apiClient.get<OwnerStatsDto>('/api/v1/owner/stats').then((r) => r.data),

  getSettings: () =>
    apiClient.get<PlatformSettingsDto>('/api/v1/admin/settings').then((r) => r.data),

  updateSettings: (data: UpdateSettingsRequest) =>
    apiClient.put<PlatformSettingsDto>('/api/v1/admin/settings', data).then((r) => r.data),

  // ── Admin role management (super-admin only; enforced server-side) ──
  listAdmins: () =>
    apiClient.get<AdminSummary[]>('/api/v1/admin/admins').then((r) => r.data),

  setAdminRole: (id: number, adminRole: AdminRoleValue) =>
    apiClient
      .patch<MessageResponse>(`/api/v1/admin/users/${id}/admin-role`, { adminRole })
      .then((r) => r.data),

  // ── App configuration / system info (super-admin only; enforced server-side) ──
  getSystemInfo: () =>
    apiClient.get<SystemInfo>('/api/v1/admin/system-info').then((r) => r.data),
};
