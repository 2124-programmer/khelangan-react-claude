import {
  useQuery, useMutation, useQueryClient, useInfiniteQuery,
} from '@tanstack/react-query';
import { subscriptionService } from '../services/subscriptionService';
import {
  adaptSubscriptionPlan, adaptSubscription, adaptChangeRequest, adaptVenueSubscriptionView,
  adaptVenueSubscriptionRow, adaptPlanOption, adaptSelectableCourt, adaptVenueSubscriptionState,
} from '../adapters';
import type {
  SubscriptionCreateRequest, SubscriptionEditRequest, UpdatePlanRequest,
  UpgradeRequestCreate, CourtSelectionBody, PaidRequestBody,
  CreateCourtChangeRequestBody,
} from '../types';
import { VENUES_KEY, OWNER_VENUES_KEY } from './useVenues';
import { useAuth } from '../../store/AuthContext';

export const SUBS_PLANS_KEY = ['subscription-plans'] as const;
export const OWNER_SUB_KEY = ['owner', 'venue-subscription'] as const;
export const ADMIN_SUB_KEY = ['admin', 'subscriptions'] as const;
export const ADMIN_VENUE_SUBS_KEY = ['admin', 'venue-subscriptions'] as const;
export const ADMIN_CHANGE_REQ_KEY = ['admin', 'subscription-change-requests'] as const;

const VENUE_SUBS_PAGE_SIZE = 15;

/** Searchable, paginated admin venue-subscription table (infinite scroll). */
export function useAdminVenueSubscriptions(params: { q?: string; status?: string }) {
  const q = params.q?.trim() || undefined;
  const status = params.status && params.status !== 'ALL' ? params.status : undefined;
  return useInfiniteQuery({
    queryKey: [...ADMIN_VENUE_SUBS_KEY, { q: q ?? '', status: status ?? 'ALL' }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const page = await subscriptionService.adminListVenueSubscriptions({
        q, status, page: pageParam as number, size: VENUE_SUBS_PAGE_SIZE,
      });
      return {
        rows: (page.content ?? []).map(adaptVenueSubscriptionRow),
        number: page.number ?? (pageParam as number),
        totalPages: page.totalPages ?? 1,
        totalElements: page.totalElements ?? 0,
      };
    },
    getNextPageParam: (last) => (last.number < last.totalPages - 1 ? last.number + 1 : undefined),
  });
}

// ─── Plans ──────────────────────────────────────────────────────────────────
export function useOwnerPlans(enabled = true) {
  return useQuery({
    queryKey: [...SUBS_PLANS_KEY, 'owner'],
    queryFn: () => subscriptionService.ownerListPlans().then((l) => l.map(adaptSubscriptionPlan)),
    enabled,
  });
}

export function useAdminPlans(enabled = true) {
  return useQuery({
    queryKey: [...SUBS_PLANS_KEY, 'admin'],
    queryFn: () => subscriptionService.adminListPlans().then((l) => l.map(adaptSubscriptionPlan)),
    enabled,
  });
}

/**
 * Role-agnostic plan catalog for shared plan components (e.g. PlanInfoSheet): admins read the admin
 * catalog, everyone else reads the owner catalog. Cached once per role and shared across badges.
 */
export function useSubscriptionPlans() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const adminQ = useAdminPlans(isAdmin);
  const ownerQ = useOwnerPlans(!isAdmin);
  return isAdmin ? adminQ : ownerQ;
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlanRequest }) =>
      subscriptionService.adminUpdatePlan(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUBS_PLANS_KEY }),
  });
}

// ─── Owner venue subscription ────────────────────────────────────────────────
export function useOwnerVenueSubscription(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...OWNER_SUB_KEY, id],
    queryFn: () => subscriptionService.ownerGetVenueSubscription(id).then(adaptVenueSubscriptionView),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

export function useCreateUpgradeRequest(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpgradeRequestCreate) => subscriptionService.ownerCreateUpgradeRequest(venueId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...OWNER_SUB_KEY, venueId] }),
  });
}

// ─── Owner court-coverage purchase (self-serve trial + paid request) ─────────
export const OWNER_SUB_STATE_KEY = ['owner', 'venue-subscription-state'] as const;
export const OWNER_PLAN_OPTIONS_KEY = ['owner', 'plan-options'] as const;
export const OWNER_SELECTABLE_COURTS_KEY = ['owner', 'selectable-courts'] as const;

/**
 * A trial-start / paid-request changes court bookability, so it ripples across surfaces:
 * the venue's own state, the owner My-Venues badge, the player discovery feed + venue detail,
 * and (for paid requests) the admin subscription queues.
 */
function invalidateAfterCoverageChange(qc: ReturnType<typeof useQueryClient>, venueId: number) {
  qc.invalidateQueries({ queryKey: [...OWNER_SUB_STATE_KEY, venueId] });
  qc.invalidateQueries({ queryKey: [...OWNER_PLAN_OPTIONS_KEY, venueId] });
  qc.invalidateQueries({ queryKey: [...OWNER_SELECTABLE_COURTS_KEY, venueId] });
  qc.invalidateQueries({ queryKey: [...OWNER_SUB_KEY, venueId] });
  qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
  qc.invalidateQueries({ queryKey: VENUES_KEY });           // player feed + venue detail
  qc.invalidateQueries({ queryKey: ADMIN_VENUE_SUBS_KEY });
  qc.invalidateQueries({ queryKey: ADMIN_CHANGE_REQ_KEY });
  qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); // MRR + needs-attention
}

export function useOwnerSubscriptionState(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...OWNER_SUB_STATE_KEY, id],
    queryFn: () => subscriptionService.ownerGetSubscriptionState(id).then(adaptVenueSubscriptionState),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

export function useOwnerPlanOptions(venueId: string | number | undefined, enabled = true) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...OWNER_PLAN_OPTIONS_KEY, id],
    queryFn: () => subscriptionService.ownerGetPlanOptions(id).then((l) => l.map(adaptPlanOption)),
    enabled: enabled && !!venueId && !isNaN(id) && id > 0,
  });
}

export function useOwnerSelectableCourts(venueId: string | number | undefined, enabled = true) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...OWNER_SELECTABLE_COURTS_KEY, id],
    queryFn: () => subscriptionService.ownerGetSelectableCourts(id).then((l) => l.map(adaptSelectableCourt)),
    enabled: enabled && !!venueId && !isNaN(id) && id > 0,
  });
}

export function useStartVenueTrial(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CourtSelectionBody) =>
      subscriptionService.ownerStartTrial(venueId, data).then(adaptVenueSubscriptionState),
    onSuccess: () => invalidateAfterCoverageChange(qc, venueId),
  });
}

export function useCreateVenueSubscriptionRequest(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PaidRequestBody) => subscriptionService.ownerCreateSubscriptionRequest(venueId, data),
    onSuccess: () => invalidateAfterCoverageChange(qc, venueId),
  });
}

export function useCancelVenueSubscriptionRequest(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => subscriptionService.ownerCancelSubscriptionRequest(venueId).then(adaptVenueSubscriptionState),
    onSuccess: () => invalidateAfterCoverageChange(qc, venueId),
  });
}

// ─── Court-change requests (owner files; super-admin approves) ───────────────
export const OWNER_COURT_CHANGE_KEY = ['owner', 'court-change-requests'] as const;
export const ADMIN_COURT_CHANGE_KEY = ['admin', 'court-change-requests'] as const;

export function useOwnerCourtChangeRequests(venueId: string | number | undefined, enabled = true) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...OWNER_COURT_CHANGE_KEY, id],
    queryFn: () => subscriptionService.ownerListCourtChangeRequests(id),
    enabled: enabled && !!venueId && !isNaN(id) && id > 0,
  });
}

export function useCreateCourtChangeRequest(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    // Screen surfaces a single inline toast on failure (typed 409s) — suppress the global one.
    meta: { suppressToast: true },
    mutationFn: (body: CreateCourtChangeRequestBody) =>
      subscriptionService.ownerCreateCourtChangeRequest(venueId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...OWNER_COURT_CHANGE_KEY, venueId] });
      qc.invalidateQueries({ queryKey: ADMIN_COURT_CHANGE_KEY });
    },
  });
}

export function useCancelCourtChangeRequest(venueId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => subscriptionService.ownerCancelCourtChangeRequest(venueId, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...OWNER_COURT_CHANGE_KEY, venueId] });
      qc.invalidateQueries({ queryKey: ADMIN_COURT_CHANGE_KEY });
    },
  });
}

export function useAdminCourtChangeRequests(status = 'PENDING') {
  return useQuery({
    queryKey: [...ADMIN_COURT_CHANGE_KEY, status],
    queryFn: () => subscriptionService.adminListCourtChangeRequests(status),
  });
}

export function useApproveCourtChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subscriptionService.adminApproveCourtChangeRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COURT_CHANGE_KEY });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
      qc.invalidateQueries({ queryKey: VENUES_KEY });
    },
  });
}

export function useRejectCourtChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      subscriptionService.adminRejectCourtChangeRequest(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_COURT_CHANGE_KEY }),
  });
}

// ─── Admin venue subscription + actions ──────────────────────────────────────
export function useAdminVenueSubscription(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...ADMIN_SUB_KEY, 'venue', id],
    queryFn: () => subscriptionService.adminGetVenueSubscription(id).then(adaptVenueSubscriptionView),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

function invalidateAdminSub(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ADMIN_SUB_KEY });
  qc.invalidateQueries({ queryKey: ADMIN_VENUE_SUBS_KEY });
  qc.invalidateQueries({ queryKey: ADMIN_CHANGE_REQ_KEY });
  qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); // MRR + needs-attention
}

export function useCreateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubscriptionCreateRequest) =>
      subscriptionService.adminCreate(data).then(adaptSubscription),
    onSuccess: () => invalidateAdminSub(qc),
  });
}

export function useEditSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SubscriptionEditRequest }) =>
      subscriptionService.adminEdit(id, data).then(adaptSubscription),
    onSuccess: () => invalidateAdminSub(qc),
  });
}

export function useVoidSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subscriptionService.adminVoid(id).then(adaptSubscription),
    onSuccess: () => invalidateAdminSub(qc),
  });
}

export function useRenewSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subscriptionService.adminRenew(id).then(adaptSubscription),
    onSuccess: () => invalidateAdminSub(qc),
  });
}

// ─── Admin change-request queue ──────────────────────────────────────────────
export function useChangeRequests(status = 'PENDING') {
  return useQuery({
    queryKey: [...ADMIN_CHANGE_REQ_KEY, status],
    queryFn: () => subscriptionService.adminListChangeRequests(status).then((l) => l.map(adaptChangeRequest)),
  });
}

/** Courts of a change request's venue for the admin court picker (isCovered = owner's request). */
export function useChangeRequestCourts(requestId: string | number | undefined, enabled = true) {
  const id = Number(requestId);
  return useQuery({
    queryKey: [...ADMIN_CHANGE_REQ_KEY, 'courts', id],
    queryFn: () => subscriptionService.adminListChangeRequestCourts(id).then((l) => l.map(adaptSelectableCourt)),
    enabled: enabled && !!requestId && !isNaN(id) && id > 0,
  });
}

/**
 * Approve + activate a change request (offline/cash received). Pass optional `courtIds` to override
 * which courts the activated subscription covers; omit to keep the owner's requested selection.
 */
export function useActivateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, courtIds }: { id: number; courtIds?: string[] }) =>
      subscriptionService
        .adminActivateChangeRequest(id, courtIds ? { courtIds } : undefined)
        .then(adaptSubscription),
    onSuccess: () => invalidateAdminSub(qc),
  });
}

export function useRejectChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      subscriptionService.adminRejectChangeRequest(id, { reason }).then(adaptChangeRequest),
    onSuccess: () => invalidateAdminSub(qc),
  });
}
