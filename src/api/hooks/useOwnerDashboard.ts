import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ownerDashboardService } from '../services/ownerDashboardService';

export const ownerDashboardKeys = {
  summary: () => ['owner', 'dashboard', 'summary'] as const,
};

export function useOwnerDashboardSummary() {
  return useQuery({
    queryKey: ownerDashboardKeys.summary(),
    queryFn: () => ownerDashboardService.getSummary(),
    staleTime: 30_000,
  });
}

export function useInvalidateDashboard() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ownerDashboardKeys.summary() });
}
