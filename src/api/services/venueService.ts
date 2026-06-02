import { apiClient } from '../client';
import type {
  VenueSummaryDto, VenueDetailDto, CreateVenueRequest,
  UpdateVenueRequest, VenueStatusRequest, Page,
} from '../types';

export const venueService = {
  // Public — no token required
  list: (params?: { city?: string; sport?: string; search?: string; page?: number; size?: number }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/venues', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<VenueDetailDto>(`/api/v1/venues/${id}`).then((r) => r.data),

  // Owner
  create: (data: CreateVenueRequest) =>
    apiClient.post<VenueDetailDto>('/api/v1/venues', data).then((r) => r.data),

  update: (id: number, data: UpdateVenueRequest) =>
    apiClient.put<VenueDetailDto>(`/api/v1/venues/${id}`, data).then((r) => r.data),

  listOwner: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/owner/venues', { params }).then((r) => r.data),

  // Admin
  listAdmin: (params?: { page?: number; size?: number; status?: string }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/admin/venues', { params }).then((r) => r.data),

  updateStatus: (id: number, data: VenueStatusRequest) =>
    apiClient.patch<VenueDetailDto>(`/api/v1/venues/${id}/status`, data).then((r) => r.data),
};
