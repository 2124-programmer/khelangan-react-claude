import { apiClient } from '../client';
import type {
  SubscriptionPlanDto, SubscriptionDto, SubscriptionChangeRequestDto,
  VenueSubscriptionViewDto, SubscriptionCreateRequest, SubscriptionEditRequest,
  UpdatePlanRequest, UpgradeRequestCreate, RejectChangeRequestBody, Page,
} from '../types';

export const subscriptionService = {
  // ─── Admin: plan catalog ──────────────────────────────────────────────────
  adminListPlans: () =>
    apiClient.get<SubscriptionPlanDto[]>('/api/v1/admin/subscription-plans').then((r) => r.data),

  adminUpdatePlan: (id: number, data: UpdatePlanRequest) =>
    apiClient.put<SubscriptionPlanDto>(`/api/v1/admin/subscription-plans/${id}`, data).then((r) => r.data),

  // ─── Admin: subscriptions ─────────────────────────────────────────────────
  adminCreate: (data: SubscriptionCreateRequest) =>
    apiClient.post<SubscriptionDto>('/api/v1/admin/subscriptions', data).then((r) => r.data),

  adminEdit: (id: number, data: SubscriptionEditRequest) =>
    apiClient.put<SubscriptionDto>(`/api/v1/admin/subscriptions/${id}`, data).then((r) => r.data),

  adminVoid: (id: number) =>
    apiClient.delete<SubscriptionDto>(`/api/v1/admin/subscriptions/${id}`).then((r) => r.data),

  adminRenew: (id: number) =>
    apiClient.post<SubscriptionDto>(`/api/v1/admin/subscriptions/${id}/renew`).then((r) => r.data),

  adminList: (params?: { venueId?: number; ownerId?: number; status?: string; page?: number; size?: number }) =>
    apiClient.get<Page<SubscriptionDto>>('/api/v1/admin/subscriptions', { params }).then((r) => r.data),

  adminGetVenueSubscription: (venueId: number) =>
    apiClient.get<VenueSubscriptionViewDto>(`/api/v1/admin/venues/${venueId}/subscription`).then((r) => r.data),

  // ─── Admin: change requests ───────────────────────────────────────────────
  adminListChangeRequests: (status = 'PENDING') =>
    apiClient.get<SubscriptionChangeRequestDto[]>('/api/v1/admin/subscription-change-requests', {
      params: { status },
    }).then((r) => r.data),

  adminActivateChangeRequest: (id: number) =>
    apiClient.post<SubscriptionDto>(`/api/v1/admin/subscription-change-requests/${id}/activate`).then((r) => r.data),

  adminRejectChangeRequest: (id: number, data: RejectChangeRequestBody) =>
    apiClient.post<SubscriptionChangeRequestDto>(
      `/api/v1/admin/subscription-change-requests/${id}/reject`, data).then((r) => r.data),

  // ─── Owner ────────────────────────────────────────────────────────────────
  ownerListPlans: () =>
    apiClient.get<SubscriptionPlanDto[]>('/api/v1/owner/subscription-plans').then((r) => r.data),

  ownerGetVenueSubscription: (venueId: number) =>
    apiClient.get<VenueSubscriptionViewDto>(`/api/v1/owner/venues/${venueId}/subscription`).then((r) => r.data),

  ownerCreateUpgradeRequest: (venueId: number, data: UpgradeRequestCreate) =>
    apiClient.post<SubscriptionChangeRequestDto>(
      `/api/v1/owner/venues/${venueId}/subscription/upgrade-requests`, data).then((r) => r.data),
};
