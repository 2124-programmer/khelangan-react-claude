import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sportService } from '../services/sportService';
import { adaptSport } from '../adapters';
import type { CreateSportRequest, UpdateSportRequest } from '../types';

export const SPORTS_KEY = ['sports'] as const;

export function useSports() {
  return useQuery({
    queryKey: SPORTS_KEY,
    queryFn: async () => {
      const dtos = await sportService.list();
      return dtos.map(adaptSport);
    },
    staleTime: 1000 * 60 * 10, // sports rarely change
  });
}

export function useCreateSport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSportRequest) => sportService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPORTS_KEY }),
  });
}

export function useUpdateSport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSportRequest }) =>
      sportService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPORTS_KEY }),
  });
}

export function useDeleteSport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => sportService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SPORTS_KEY }),
  });
}
