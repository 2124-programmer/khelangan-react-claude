import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slotService } from '../services/slotService';
import { adaptSlot } from '../adapters';
import type { BulkBlockRequest } from '../types';

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

export function useBlockSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) => slotService.block(slotId),
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
