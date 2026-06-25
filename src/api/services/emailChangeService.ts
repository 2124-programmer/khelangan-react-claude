import { apiClient } from '../client';
import type {
  EmailChangeCreateRequest, EmailChangeVerifyRequest, EmailChangeRequestDto,
  MessageResponse,
} from '../types';

const OWNER_BASE = '/api/v1/owner/email-change-requests';

// Email change is fully self-service: verifying the OTP applies the change immediately.
// (No admin review endpoints.)
export const emailChangeService = {
  createRequest: (data: EmailChangeCreateRequest) =>
    apiClient.post<MessageResponse>(OWNER_BASE, data).then((r) => r.data),

  verifyOtp: (data: EmailChangeVerifyRequest) =>
    apiClient.post<EmailChangeRequestDto>(`${OWNER_BASE}/verify`, data).then((r) => r.data),

  getStatus: () =>
    apiClient.get<EmailChangeRequestDto>(`${OWNER_BASE}/me`).then((r) => r.data),
};
