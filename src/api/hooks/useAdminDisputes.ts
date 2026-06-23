import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { adminDisputeService, type DisputeListParams } from '../services/adminDisputeService';
import { adaptAdminDisputeStats, adaptAdminDisputeRow, adaptAdminDisputeDetail } from '../adapters';
import { ADMIN_PLAYERS_KEY } from './usePlayers';
import { ADMIN_OWNERS_KEY } from './useOwners';
import { ADMIN_VENUES_KEY } from './useVenues';
import { ADMIN_VENUE_SUBS_KEY } from './useSubscription';
import type {
  DisputeResolveBody, DisputeReasonBody, DisputeMessageBody, DisputeRequestInfoBody, DisputeNoteBody,
} from '../types';

export const ADMIN_DISPUTES_KEY = ['admin', 'disputes'] as const;
const PAGE_SIZE = 20;

export function useAdminDisputesInfinite(params: {
  q?: string; status?: string[]; category?: string[]; priority?: string; assigned?: string; sort?: string;
}) {
  const q = params.q?.trim() || undefined;
  const status = params.status ?? [];
  const category = params.category ?? [];
  const priority = params.priority || undefined;
  const assigned = params.assigned || 'ANYONE';
  const sort = params.sort || 'PRIORITY';
  return useInfiniteQuery({
    queryKey: [...ADMIN_DISPUTES_KEY, 'list', { q: q ?? '', status, category, priority: priority ?? '', assigned, sort }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const listParams: DisputeListParams = {
        q, status: status.length ? status : undefined, category: category.length ? category : undefined,
        priority, assigned, sort, page: pageParam as number, size: PAGE_SIZE,
      };
      const page = await adminDisputeService.list(listParams);
      return {
        disputes: (page.content ?? []).map(adaptAdminDisputeRow),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

export function useDisputeStats() {
  return useQuery({
    queryKey: [...ADMIN_DISPUTES_KEY, 'stats'],
    queryFn: () => adminDisputeService.stats().then(adaptAdminDisputeStats),
  });
}

export function useDisputeDetail(id: string | number | undefined) {
  const numId = Number(id);
  return useQuery({
    queryKey: [...ADMIN_DISPUTES_KEY, 'detail', numId],
    queryFn: () => adminDisputeService.detail(numId).then(adaptAdminDisputeDetail),
    enabled: !!id && !isNaN(numId) && numId > 0,
  });
}

/**
 * Dispute mutations refresh the dispute screens; resolutions can suspend/ban/flag a party or run the
 * owner cascade, so we also invalidate Players, Owners, Venues and Subscriptions.
 */
function useDisputeAction<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_DISPUTES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_PLAYERS_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_OWNERS_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_VENUES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_VENUE_SUBS_KEY });
    },
  });
}

export function useAssignDispute() {
  return useDisputeAction<{ id: number; adminId?: number | null }>(({ id, adminId }) => adminDisputeService.assign(id, adminId));
}
export function useMessageDispute() {
  return useDisputeAction<{ id: number; body: DisputeMessageBody }>(({ id, body }) => adminDisputeService.message(id, body));
}
export function useRequestDisputeInfo() {
  return useDisputeAction<{ id: number; body: DisputeRequestInfoBody }>(({ id, body }) => adminDisputeService.requestInfo(id, body));
}
export function useAddDisputeNote() {
  return useDisputeAction<{ id: number; body: DisputeNoteBody }>(({ id, body }) => adminDisputeService.addNote(id, body));
}
export function useResolveAdminDispute() {
  return useDisputeAction<{ id: number; body: DisputeResolveBody }>(({ id, body }) => adminDisputeService.resolve(id, body));
}
export function useDismissDispute() {
  return useDisputeAction<{ id: number; body: DisputeReasonBody }>(({ id, body }) => adminDisputeService.dismiss(id, body));
}
export function useReopenDispute() {
  return useDisputeAction<{ id: number; body: DisputeReasonBody }>(({ id, body }) => adminDisputeService.reopen(id, body));
}
