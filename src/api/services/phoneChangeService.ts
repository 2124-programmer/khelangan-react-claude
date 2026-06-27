import { apiClient } from '../client';
import type {
  PhoneChangeCreateRequest, PhoneChangeVerifyRequest, PhoneChangeRequestDto,
  MessageResponse,
} from '../types';

const BASE = '/api/v1/users/me/phone-change-requests';

// Phone change is fully self-service: verifying the OTP applies the change immediately.
export const phoneChangeService = {
  createRequest: (data: PhoneChangeCreateRequest) =>
    apiClient.post<MessageResponse>(BASE, data).then((r) => r.data),

  verifyOtp: (data: PhoneChangeVerifyRequest) =>
    apiClient.post<PhoneChangeRequestDto>(`${BASE}/verify`, data).then((r) => r.data),

  getStatus: () =>
    apiClient.get<PhoneChangeRequestDto>(`${BASE}/me`).then((r) => r.data),
};
