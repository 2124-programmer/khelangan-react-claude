import { apiClient } from '../client';
import type {
  AdminStatsDto, OwnerStatsDto, PlatformSettingsDto, UpdateSettingsRequest,
  DashboardSummaryDto, DashboardPeriodDto,
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
};
