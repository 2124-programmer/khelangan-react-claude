import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { ownerService } from '../services/ownerService';
import {
  adaptAdminOwnerStats, adaptOwnerRow, adaptOwnerDetail, adaptOwnerBookingRow,
  adaptVenueSummary, adaptVenueSubscriptionRow, adaptPlayerAuditRow,
} from '../adapters';
import { ADMIN_VENUES_KEY } from './useVenues';
import { ADMIN_VENUE_SUBS_KEY } from './useSubscription';
import type {
  OwnerReasonBody, OwnerSuspendBody, OwnerBanBody, OwnerVerificationBody, OwnerMessageBody,
} from '../types';

export const ADMIN_OWNERS_KEY = ['admin', 'owners'] as const;
const PAGE_SIZE = 20;

export function useOwnersInfinite(params: { q?: string; segment?: string; sort?: string }) {
  const q = params.q?.trim() || undefined;
  const segment = params.segment || 'ALL';
  const sort = params.sort || 'RECENTLY_ACTIVE';
  return useInfiniteQuery({
    queryKey: [...ADMIN_OWNERS_KEY, 'list', { q: q ?? '', segment, sort }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await ownerService.list({ q, segment, sort, page: pageParam as number, size: PAGE_SIZE });
      return {
        owners: (page.content ?? []).map(adaptOwnerRow),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

export function useOwnerStats() {
  return useQuery({
    queryKey: [...ADMIN_OWNERS_KEY, 'stats'],
    queryFn: () => ownerService.stats().then(adaptAdminOwnerStats),
  });
}

export function useOwnerDetail(id: string | number | undefined) {
  const numId = Number(id);
  return useQuery({
    queryKey: [...ADMIN_OWNERS_KEY, 'detail', numId],
    queryFn: () => ownerService.detail(numId).then(adaptOwnerDetail),
    enabled: !!id && !isNaN(numId) && numId > 0,
  });
}

export function useOwnerVenues(id: string | number | undefined) {
  const numId = Number(id);
  return useInfiniteQuery({
    queryKey: [...ADMIN_OWNERS_KEY, 'detail', numId, 'venues'],
    initialPageParam: 0,
    enabled: !!id && !isNaN(numId) && numId > 0,
    queryFn: async ({ pageParam }) => {
      const page = await ownerService.venues(numId, { page: pageParam as number, size: PAGE_SIZE });
      return {
        venues: (page.content ?? []).map(adaptVenueSummary),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

export function useOwnerSubscriptions(id: string | number | undefined) {
  const numId = Number(id);
  return useQuery({
    queryKey: [...ADMIN_OWNERS_KEY, 'detail', numId, 'subscriptions'],
    enabled: !!id && !isNaN(numId) && numId > 0,
    queryFn: () => ownerService.subscriptions(numId).then((rows) => rows.map(adaptVenueSubscriptionRow)),
  });
}

function detailListHook(kind: 'bookings' | 'audit', adapt: (d: any) => any) {
  return (id: string | number | undefined) => {
    const numId = Number(id);
    return useInfiniteQuery({
      queryKey: [...ADMIN_OWNERS_KEY, 'detail', numId, kind],
      initialPageParam: 0,
      enabled: !!id && !isNaN(numId) && numId > 0,
      queryFn: async ({ pageParam }) => {
        const page = await ownerService[kind](numId, { page: pageParam as number, size: PAGE_SIZE });
        return {
          rows: (page.content ?? []).map(adapt),
          number: page.number ?? (pageParam as number),
          totalPages: page.totalPages ?? 1,
          totalElements: page.totalElements ?? 0,
        };
      },
      getNextPageParam: (last: { number: number; totalPages: number }) =>
        (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
    });
  };
}

export const useOwnerBookings = detailListHook('bookings', adaptOwnerBookingRow);
export const useOwnerAudit = detailListHook('audit', adaptPlayerAuditRow);

function useOwnerAction<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(args),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_OWNERS_KEY });
      // The cascade unlists/archives venues and voids subscriptions — refresh those screens too.
      qc.invalidateQueries({ queryKey: ADMIN_VENUES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_VENUE_SUBS_KEY });
    },
  });
}

export function useSuspendOwner() {
  return useOwnerAction<{ id: number; body: OwnerSuspendBody }>(({ id, body }) => ownerService.suspend(id, body));
}
export function useReactivateOwner() {
  return useOwnerAction<number>((id) => ownerService.reactivate(id));
}
export function useBanOwner() {
  return useOwnerAction<{ id: number; body: OwnerBanBody }>(({ id, body }) => ownerService.ban(id, body));
}
export function useUnbanOwner() {
  return useOwnerAction<number>((id) => ownerService.unban(id));
}
export function useSetOwnerVerification() {
  return useOwnerAction<{ id: number; body: OwnerVerificationBody }>(({ id, body }) => ownerService.verification(id, body));
}
export function useForceLogoutOwner() {
  return useOwnerAction<number>((id) => ownerService.forceLogout(id));
}
export function useResetOwnerPassword() {
  return useOwnerAction<number>((id) => ownerService.resetPassword(id));
}
export function useMessageOwner() {
  return useOwnerAction<{ id: number; body: OwnerMessageBody }>(({ id, body }) => ownerService.message(id, body));
}
export function useDeleteOwner() {
  return useOwnerAction<{ id: number; body: OwnerReasonBody }>(({ id, body }) => ownerService.remove(id, body));
}
