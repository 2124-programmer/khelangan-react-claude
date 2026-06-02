import { apiClient } from '../client';
import type { DisputeDto, CreateDisputeRequest, ResolveDisputeRequest, Page } from '../types';

export const disputeService = {
  // Role-scoped
  list: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<DisputeDto>>('/api/v1/disputes', { params }).then((r) => r.data),

  create: (data: CreateDisputeRequest) =>
    apiClient.post<DisputeDto>('/api/v1/disputes', data).then((r) => r.data),

  // Admin
  resolve: (id: number, data: ResolveDisputeRequest) =>
    apiClient.patch<DisputeDto>(`/api/v1/disputes/${id}/resolve`, data).then((r) => r.data),
};
