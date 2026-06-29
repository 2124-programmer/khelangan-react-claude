import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { venueService } from '../services/venueService';
import {
  adaptVenueSummary, adaptVenueDetail, adaptAdminVenueDetail, adaptVenueCounts,
} from '../adapters';
import type { CreateVenueRequest, UpdateVenueRequest, VenueStatusRequest } from '../types';
import type { Venue } from '../../types';
import { toast } from '../../toast';

export const VENUES_KEY = ['venues'] as const;

type VenueListData = { venues: Venue[]; totalPages: number; totalElements: number };
type InfiniteVenueData = { pages: { venues: Venue[] }[]; pageParams: unknown[] };

const flipFavorite = (venues: Venue[], venueId: string, next: boolean): Venue[] =>
  venues.map((v) => (v.id === venueId ? { ...v, isFavorite: next } : v));
export const OWNER_VENUES_KEY = ['owner', 'venues'] as const;
export const ADMIN_VENUES_KEY = ['admin', 'venues'] as const;

export function useVenues(params?: { city?: string; sport?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: [...VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.list(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
    // Venue listings don't change second-to-second; keep results fresh for 60s so quick
    // remounts (tab switches, guest→player transition) reuse the cache instead of refetching.
    staleTime: 60_000,
  });
}

export const VENUES_PAGE_SIZE = 15;

export type VenueDiscoveryParams = {
  sport?: string;
  search?: string;
  sort?: string;
  lat?: number;
  lng?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
};

/** Home/discovery feed with server-side filter/sort + infinite scroll (page size 15). */
export function useInfiniteVenues(params: VenueDiscoveryParams) {
  return useInfiniteQuery({
    queryKey: [...VENUES_KEY, 'infinite', params],
    // The Home screen renders an inline <ErrorState> (via <QueryState>) for load failures, so
    // opt out of the global error toast to avoid double-reporting the same failure.
    meta: { suppressToast: true },
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await venueService.list({ ...params, page: pageParam as number, size: VENUES_PAGE_SIZE });
      return {
        venues: page.content.map(adaptVenueSummary),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
    // Discovery feed is the most-mounted query (Home + guest Home). Reuse pages across quick
    // remounts for 60s rather than re-fetching the whole feed on every navigation back.
    staleTime: 60_000,
  });
}

export function useVenueDetail(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...VENUES_KEY, id],
    queryFn: () => venueService.getById(id).then(adaptVenueDetail),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

export function useOwnerVenues(params?: { page?: number }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...OWNER_VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.listOwner(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
    enabled: options?.enabled !== false,
  });
}

/** Admin-only full venue detail (any status) + owner context, for the approval review screen. */
export function useAdminVenueDetail(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...ADMIN_VENUES_KEY, 'detail', id],
    queryFn: () => venueService.getAdminById(id).then(adaptAdminVenueDetail),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

const ADMIN_VENUES_PAGE_SIZE = 15;

/** Unified admin Venues screen — searchable, status-filtered, infinite scroll. */
export function useAdminVenuesInfinite(params: { status?: string; q?: string }) {
  const status = params.status || 'ALL';
  const q = params.q?.trim() || undefined;
  return useInfiniteQuery({
    queryKey: [...ADMIN_VENUES_KEY, 'registry', { status, q: q ?? '' }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await venueService.listAdmin({
        status, q, page: pageParam as number, size: ADMIN_VENUES_PAGE_SIZE,
      });
      return {
        venues: page.content.map(adaptVenueSummary),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

export function useAdminVenueCounts() {
  return useQuery({
    queryKey: [...ADMIN_VENUES_KEY, 'counts'],
    queryFn: () => venueService.countsAdmin().then(adaptVenueCounts),
  });
}

export function useAdminVenues(params?: { page?: number; size?: number; status?: string }) {
  return useQuery({
    queryKey: [...ADMIN_VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.listAdmin(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

/**
 * Toggle a venue favorite with an optimistic flip across every cached venue list.
 * The detail query shares the `['venues', …]` prefix but holds a single Venue (no
 * `.venues` array), so the updater leaves it untouched. Rolls back on error.
 */
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, next }: { venueId: string; next: boolean }) =>
      next ? venueService.favorite(Number(venueId)) : venueService.unfavorite(Number(venueId)),
    onMutate: async ({ venueId, next }) => {
      await qc.cancelQueries({ queryKey: VENUES_KEY });
      const snapshots = qc.getQueriesData({ queryKey: VENUES_KEY });
      qc.setQueriesData({ queryKey: VENUES_KEY }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        // Infinite feed: { pages: [{ venues }], pageParams }
        if ('pages' in old && Array.isArray((old as InfiniteVenueData).pages)) {
          const inf = old as InfiniteVenueData;
          return {
            ...inf,
            pages: inf.pages.map((pg) =>
              Array.isArray(pg?.venues) ? { ...pg, venues: flipFavorite(pg.venues, venueId, next) } : pg),
          };
        }
        // Regular list query: { venues: [...] }
        if ('venues' in old && Array.isArray((old as VenueListData).venues)) {
          const list = old as VenueListData;
          return { ...list, venues: flipFavorite(list.venues, venueId, next) };
        }
        return old;
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error('Could not update favorite. Please try again.');
    },
  });
}

/**
 * Records a contact intent (Call/WhatsApp) and notifies the venue owner. Best-effort: the
 * caller launches the dialer/WhatsApp regardless of the outcome, so errors are swallowed here
 * (no toast, no cache writes) and never block the user's intent to reach the venue.
 */
export function useContactVenue() {
  return useMutation({
    mutationFn: ({ venueId, channel }: { venueId: string; channel: 'CALL' | 'WHATSAPP' }) =>
      venueService.contact(Number(venueId), channel),
    onError: (err) => {
      if (__DEV__) console.warn('contactVenue failed (non-blocking):', err);
    },
  });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVenueRequest) => venueService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENUES_KEY });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
    },
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVenueRequest }) =>
      venueService.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [...VENUES_KEY, id] });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
    },
  });
}

export function useUploadVenueImage() {
  return useMutation({
    mutationFn: (localUri: string) => venueService.uploadImage(localUri),
  });
}

export function useUpdateVenueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VenueStatusRequest }) =>
      venueService.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENUES_KEY });
      // ADMIN_VENUES_KEY cascades to the registry list, counts, and detail queries.
      qc.invalidateQueries({ queryKey: ADMIN_VENUES_KEY });
      // Dashboard "Pending Approvals" badge + aggregated summary (all periods).
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useSubmitVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, planId }: { venueId: number; planId?: number }) =>
      venueService.submit(venueId, planId != null ? { planId } : undefined),
    onSuccess: (_data, { venueId }) => {
      qc.invalidateQueries({ queryKey: [...VENUES_KEY, venueId] });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
    },
  });
}
