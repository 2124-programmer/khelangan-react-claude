import { apiClient } from '../client';
import type { PayoutDto, Page } from '../types';

export const payoutService = {
  // Owner: list their payouts
  listOwner: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<PayoutDto>>('/api/v1/owner/payouts', { params }).then((r) => r.data),

  // Admin
  listAdmin: (params?: { page?: number; size?: number; status?: string }) =>
    apiClient.get<Page<PayoutDto>>('/api/v1/admin/payouts', { params }).then((r) => r.data),

  process: (id: number) =>
    apiClient.post<PayoutDto>(`/api/v1/admin/payouts/${id}/process`).then((r) => r.data),
};
