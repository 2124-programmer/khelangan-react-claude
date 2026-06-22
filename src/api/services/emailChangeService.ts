import { apiClient } from '../client';
import type {
  EmailChangeCreateRequest, EmailChangeVerifyRequest, EmailChangeRequestDto,
  EmailChangeRejectRequest, MessageResponse,
} from '../types';

const OWNER_BASE = '/api/v1/owner/email-change-requests';
const ADMIN_BASE = '/api/v1/admin/email-change-requests';

export const emailChangeService = {
  createRequest: (data: EmailChangeCreateRequest) =>
    apiClient.post<MessageResponse>(OWNER_BASE, data).then((r) => r.data),

  verifyOtp: (data: EmailChangeVerifyRequest) =>
    apiClient.post<EmailChangeRequestDto>(`${OWNER_BASE}/verify`, data).then((r) => r.data),

  getStatus: () =>
    apiClient.get<EmailChangeRequestDto>(`${OWNER_BASE}/me`).then((r) => r.data),

  adminList: (status = 'PENDING', page = 0, size = 20) =>
    apiClient
      .get<{ content: EmailChangeRequestDto[]; totalElements: number; totalPages: number }>(ADMIN_BASE, {
        params: { status, page, size },
      })
      .then((r) => r.data),

  adminApprove: (id: string) =>
    apiClient.post<EmailChangeRequestDto>(`${ADMIN_BASE}/${id}/approve`).then((r) => r.data),

  adminReject: (id: string, data: EmailChangeRejectRequest) =>
    apiClient.post<EmailChangeRequestDto>(`${ADMIN_BASE}/${id}/reject`, data).then((r) => r.data),
};
