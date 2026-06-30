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
    // Screen shows one inline toast on failure — suppress the global handler's second toast.
    meta: { suppressToast: true },
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
    meta: { suppressToast: true },
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

// Make a court LIVE or LOCKED. The screen handles the typed 409 (COURT_LIVE_LIMIT) inline, so
// suppress the global error toast to avoid a second, generic one.
export function useSetCourtLive(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, live }: { courtId: number; live: boolean }) =>
      courtService.setLive(venueId, courtId, live),
    meta: { suppressToast: true },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: courtsKey(venueId) });
      // OWNER_SUB_STATE_KEY / selectable-courts / plan-options all live under ['owner', ...]
      qc.invalidateQueries({ queryKey: ['owner'] });
      qc.invalidateQueries({ queryKey: ['venues'] });
    },
  });
}
