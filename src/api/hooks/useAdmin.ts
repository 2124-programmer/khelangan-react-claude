import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { adaptAdminStats, adaptOwnerStats, adaptDashboardSummary } from '../adapters';
import type { UpdateSettingsRequest } from '../types';
import type { DashboardPeriod } from '../../types';

export const ADMIN_STATS_KEY = ['admin', 'stats'] as const;
export const OWNER_STATS_KEY = ['owner', 'stats'] as const;
export const SETTINGS_KEY = ['admin', 'settings'] as const;
export const ADMIN_DASHBOARD_KEY = ['admin', 'dashboard'] as const;

/** Stable typed key per period; mutations may invalidate `ADMIN_DASHBOARD_KEY` to refresh all periods. */
export const adminDashboardKey = (period: DashboardPeriod) =>
  [...ADMIN_DASHBOARD_KEY, period] as const;

export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => adminService.getStats().then(adaptAdminStats),
    refetchInterval: 60_000,
  });
}

/** Single call powering the whole admin dashboard for the selected period. */
export function useDashboardSummary(period: DashboardPeriod) {
  return useQuery({
    queryKey: adminDashboardKey(period),
    queryFn: () => adminService.getDashboardSummary(period).then(adaptDashboardSummary),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useOwnerStats() {
  return useQuery({
    queryKey: OWNER_STATS_KEY,
    queryFn: () => adminService.getOwnerStats().then(adaptOwnerStats),
    refetchInterval: 60_000,
  });
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => adminService.getSettings(),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSettingsRequest) => adminService.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}
