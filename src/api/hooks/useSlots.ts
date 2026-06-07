import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slotService } from '../services/slotService';
import { adaptSlot } from '../adapters';
import type { BulkBlockRequest } from '../types';
import type { CourtSlotsGroup } from '../../types';

export function slotsKey(courtId: number, date: string) {
  return ['slots', courtId, date] as const;
}

export function useSlots(courtId: number | undefined, date: string) {
  return useQuery({
    queryKey: slotsKey(courtId ?? 0, date),
    queryFn: () =>
      slotService.listByCourtAndDate(courtId!, date).then((dtos) => dtos.map(adaptSlot)),
    enabled: !!courtId && !!date,
    staleTime: 30_000, // slots change quickly — 30s cache
  });
}

export function useVenueSlots(
  venueId: number | undefined,
  date: string,
  sportId?: number,
): ReturnType<typeof useQuery<CourtSlotsGroup[]>> {
  return useQuery<CourtSlotsGroup[]>({
    queryKey: ['venueSlots', venueId, date, sportId],
    queryFn: () =>
      slotService.listByVenueAndDate(venueId!, date, sportId).then((groups) =>
        groups.map((g) => ({
          courtId: String(g.courtId ?? 0),
          courtName: g.courtName ?? '',
          slots: (g.slots ?? []).map(adaptSlot),
        }))
      ),
    enabled: !!venueId && !!date,
    staleTime: 30_000,
  });
}

export function useBlockSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) => slotService.block(slotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  });
}

export function useBlockSlotByTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, date, startTime, endTime }: {
      courtId: number; date: string; startTime: string; endTime: string;
    }) => slotService.blockByTime(courtId, date, startTime, endTime),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  });
}

export function useUnblockSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) => slotService.unblock(slotId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  });
}

export function useBulkBlockSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ courtId, data }: { courtId: number; data: BulkBlockRequest }) =>
      slotService.bulkBlock(courtId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  });
}
