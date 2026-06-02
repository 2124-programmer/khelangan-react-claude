import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payoutService } from '../services/payoutService';
import { adaptPayout } from '../adapters';

export const OWNER_PAYOUTS_KEY = ['owner', 'payouts'] as const;
export const ADMIN_PAYOUTS_KEY = ['admin', 'payouts'] as const;

export function useOwnerPayouts(params?: { page?: number }) {
  return useQuery({
    queryKey: [...OWNER_PAYOUTS_KEY, params],
    queryFn: async () => {
      const page = await payoutService.listOwner(params);
      return {
        payouts: page.content.map(adaptPayout),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useAdminPayouts(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: [...ADMIN_PAYOUTS_KEY, params],
    queryFn: async () => {
      const page = await payoutService.listAdmin(params);
      return {
        payouts: page.content.map(adaptPayout),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useProcessPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => payoutService.process(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_PAYOUTS_KEY }),
  });
}
