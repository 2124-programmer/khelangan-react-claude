import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../services/subscriptionService';
import {
  adaptSubscriptionPlan, adaptSubscription, adaptChangeRequest, adaptVenueSubscriptionView,
} from '../adapters';
import type {
  SubscriptionCreateRequest, SubscriptionEditRequest, UpdatePlanRequest,
  UpgradeRequestCreate,
} from '../types';

export const SUBS_PLANS_KEY = ['subscription-plans'] as const;
export const OWNER_SUB_KEY = ['owner', 'venue-subscription'] as const;
export const ADMIN_SUB_KEY = ['admin', 'subscriptions'] as const;
export const ADMIN_CHANGE_REQ_KEY = ['admin', 'subscription-change-requests'] as const;

// ─── Plans ──────────────────────────────────────────────────────────────────
export function useOwnerPlans() {
  return useQuery({
    queryKey: [...SUBS_PLANS_KEY, 'owner'],
    queryFn: () => subscriptionService.ownerListPlans().then((l) => l.map(adaptSubscriptionPlan)),
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: [...SUBS_PLANS_KEY, 'admin'],
    queryFn: () => subscriptionService.adminListPlans().then((l) => l.map(adaptSubscriptionPlan)),
  });
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
  qc.invalidateQueries({ queryKey: ADMIN_CHANGE_REQ_KEY });
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

export function useActivateChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subscriptionService.adminActivateChangeRequest(id).then(adaptSubscription),
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
