import { apiClient } from '../client';
import type {
  SubscriptionPlanDto, SubscriptionDto, SubscriptionChangeRequestDto,
  VenueSubscriptionViewDto, SubscriptionCreateRequest, SubscriptionEditRequest,
  UpdatePlanRequest, UpgradeRequestCreate, RejectChangeRequestBody, Page,
  VenueSubscriptionPageDto,
  PlanOptionDto, SelectableCourtDto, VenueSubscriptionStateDto,
  CourtSelectionBody, PaidRequestBody, SubscriptionRequestViewDto,
  ActivateChangeRequestBody,
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

  adminListVenueSubscriptions: (params?: { q?: string; status?: string; page?: number; size?: number }) =>
    apiClient.get<VenueSubscriptionPageDto>('/api/v1/admin/venue-subscriptions', { params }).then((r) => r.data),

  adminGetVenueSubscription: (venueId: number) =>
    apiClient.get<VenueSubscriptionViewDto>(`/api/v1/admin/venues/${venueId}/subscription`).then((r) => r.data),

  // ─── Admin: change requests ───────────────────────────────────────────────
  adminListChangeRequests: (status = 'PENDING') =>
    apiClient.get<SubscriptionChangeRequestDto[]>('/api/v1/admin/subscription-change-requests', {
      params: { status },
    }).then((r) => r.data),

  /** Courts of the request's venue for the admin court picker (isCovered = owner's requested courts). */
  adminListChangeRequestCourts: (id: number) =>
    apiClient.get<SelectableCourtDto[]>(
      `/api/v1/admin/subscription-change-requests/${id}/selectable-courts`).then((r) => r.data),

  /** Approve + activate (offline/cash). Optional courtIds override the owner's court selection. */
  adminActivateChangeRequest: (id: number, data?: ActivateChangeRequestBody) =>
    apiClient.post<SubscriptionDto>(
      `/api/v1/admin/subscription-change-requests/${id}/activate`, data ?? undefined).then((r) => r.data),

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

  // ─── Owner: court-coverage purchase (self-serve trial + paid request) ──────
  ownerGetPlanOptions: (venueId: number) =>
    apiClient.get<PlanOptionDto[]>(`/api/v1/owner/venues/${venueId}/plan-options`).then((r) => r.data),

  ownerGetSubscriptionState: (venueId: number) =>
    apiClient.get<VenueSubscriptionStateDto>(`/api/v1/owner/venues/${venueId}/subscription-state`).then((r) => r.data),

  ownerGetSelectableCourts: (venueId: number) =>
    apiClient.get<SelectableCourtDto[]>(`/api/v1/owner/venues/${venueId}/selectable-courts`).then((r) => r.data),

  ownerStartTrial: (venueId: number, data: CourtSelectionBody) =>
    apiClient.post<VenueSubscriptionStateDto>(`/api/v1/owner/venues/${venueId}/trial`, data).then((r) => r.data),

  ownerCreateSubscriptionRequest: (venueId: number, data: PaidRequestBody) =>
    apiClient.post<SubscriptionRequestViewDto>(
      `/api/v1/owner/venues/${venueId}/subscription-requests`, data).then((r) => r.data),

  ownerCancelSubscriptionRequest: (venueId: number) =>
    apiClient.post<VenueSubscriptionStateDto>(
      `/api/v1/owner/venues/${venueId}/subscription-requests/cancel`).then((r) => r.data),
};
