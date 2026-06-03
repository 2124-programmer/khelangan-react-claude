import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courtService } from '../services/courtService';
import { adaptCourt } from '../adapters';
import type { CreateCourtRequest, UpdateCourtRequest } from '../types';

export function courtsKey(venueId: number) {
  return ['courts', venueId] as const;
}

export function useCourts(venueId: number | undefined) {
  return useQuery({
    queryKey: courtsKey(venueId ?? 0),
    queryFn: () => courtService.list(venueId!).then((dtos) => dtos.map(adaptCourt)),
    enabled: !!venueId,
  });
}

export function useCreateCourt(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCourtRequest) => courtService.create(venueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courtsKey(venueId) });
      qc.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}

export function useUpdateCourt(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, data }: { courtId: number; data: UpdateCourtRequest }) =>
      courtService.update(venueId, courtId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courtsKey(venueId) });
      qc.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}

export function useDeleteCourt(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (courtId: number) => courtService.delete(venueId, courtId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courtsKey(venueId) });
      qc.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}
