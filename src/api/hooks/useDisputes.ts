import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { disputeService } from '../services/disputeService';
import { adaptDispute } from '../adapters';
import type { CreateDisputeRequest, ResolveDisputeRequest } from '../types';

export const DISPUTES_KEY = ['disputes'] as const;

export function useDisputes(params?: { page?: number }) {
  return useQuery({
    queryKey: [...DISPUTES_KEY, params],
    queryFn: async () => {
      const page = await disputeService.list(params);
      return {
        disputes: page.content.map(adaptDispute),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useCreateDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDisputeRequest) => disputeService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPUTES_KEY }),
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ResolveDisputeRequest }) =>
      disputeService.resolve(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: DISPUTES_KEY }),
  });
}
