import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { playerService } from '../services/playerService';
import {
  adaptPlayerStats, adaptPlayerRow, adaptPlayerDetail,
  adaptPlayerBookingRow, adaptPlayerPaymentRow, adaptPlayerAuditRow,
} from '../adapters';
import type {
  PlayerSuspendBody, PlayerReasonBody, PlayerVerificationBody, PlayerMessageBody,
} from '../types';

export const ADMIN_PLAYERS_KEY = ['admin', 'players'] as const;
const PAGE_SIZE = 20;

export function usePlayersInfinite(params: { q?: string; segment?: string; sort?: string }) {
  const q = params.q?.trim() || undefined;
  const segment = params.segment || 'ALL';
  const sort = params.sort || 'RECENTLY_ACTIVE';
  return useInfiniteQuery({
    queryKey: [...ADMIN_PLAYERS_KEY, 'list', { q: q ?? '', segment, sort }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await playerService.list({ q, segment, sort, page: pageParam as number, size: PAGE_SIZE });
      return {
        players: (page.content ?? []).map(adaptPlayerRow),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

export function usePlayerStats() {
  return useQuery({
    queryKey: [...ADMIN_PLAYERS_KEY, 'stats'],
    queryFn: () => playerService.stats().then(adaptPlayerStats),
  });
}

export function usePlayerDetail(id: string | number | undefined) {
  const numId = Number(id);
  return useQuery({
    queryKey: [...ADMIN_PLAYERS_KEY, 'detail', numId],
    queryFn: () => playerService.detail(numId).then(adaptPlayerDetail),
    enabled: !!id && !isNaN(numId) && numId > 0,
  });
}

function detailListHook(kind: 'bookings' | 'payments' | 'audit', adapt: (d: any) => any) {
  return (id: string | number | undefined) => {
    const numId = Number(id);
    return useInfiniteQuery({
      queryKey: [...ADMIN_PLAYERS_KEY, 'detail', numId, kind],
      initialPageParam: 0,
      enabled: !!id && !isNaN(numId) && numId > 0,
      queryFn: async ({ pageParam }) => {
        const page = await playerService[kind](numId, { page: pageParam as number, size: PAGE_SIZE });
        return {
          rows: (page.content ?? []).map(adapt),
          number: page.number ?? (pageParam as number),
          totalPages: page.totalPages ?? 1,
          totalElements: page.totalElements ?? 0,
        };
      },
      getNextPageParam: (last: any) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
    });
  };
}

export const usePlayerBookings = detailListHook('bookings', adaptPlayerBookingRow);
export const usePlayerPayments = detailListHook('payments', adaptPlayerPaymentRow);
export const usePlayerAudit = detailListHook('audit', adaptPlayerAuditRow);

function usePlayerAction<TArgs>(fn: (qc: ReturnType<typeof useQueryClient>, args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(qc, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_PLAYERS_KEY }),
  });
}

export function useSuspendPlayer() {
  return usePlayerAction<{ id: number; body: PlayerSuspendBody }>((_qc, { id, body }) => playerService.suspend(id, body));
}
export function useReactivatePlayer() {
  return usePlayerAction<number>((_qc, id) => playerService.reactivate(id));
}
export function useBanPlayer() {
  return usePlayerAction<{ id: number; body: PlayerReasonBody }>((_qc, { id, body }) => playerService.ban(id, body));
}
export function useUnbanPlayer() {
  return usePlayerAction<number>((_qc, id) => playerService.unban(id));
}
export function useSetPlayerVerification() {
  return usePlayerAction<{ id: number; body: PlayerVerificationBody }>((_qc, { id, body }) => playerService.verification(id, body));
}
export function useForceLogoutPlayer() {
  return usePlayerAction<number>((_qc, id) => playerService.forceLogout(id));
}
export function useResetPlayerPassword() {
  return usePlayerAction<number>((_qc, id) => playerService.resetPassword(id));
}
export function useMessagePlayer() {
  return usePlayerAction<{ id: number; body: PlayerMessageBody }>((_qc, { id, body }) => playerService.message(id, body));
}
