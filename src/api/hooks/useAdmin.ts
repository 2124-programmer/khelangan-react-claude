import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { adaptAdminStats, adaptOwnerStats } from '../adapters';
import type { UpdateSettingsRequest } from '../types';

export const ADMIN_STATS_KEY = ['admin', 'stats'] as const;
export const OWNER_STATS_KEY = ['owner', 'stats'] as const;
export const SETTINGS_KEY = ['admin', 'settings'] as const;

export function useAdminStats() {
  return useQuery({
    queryKey: ADMIN_STATS_KEY,
    queryFn: () => adminService.getStats().then(adaptAdminStats),
    refetchInterval: 60_000,
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
