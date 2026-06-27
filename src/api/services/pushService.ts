import { apiClient } from '../client';
import type { RegisterPushTokenRequest, MessageResponse } from '../types';

export const pushService = {
  register: (data: RegisterPushTokenRequest) =>
    apiClient.post<MessageResponse>('/api/v1/push-tokens', data).then((r) => r.data),

  unregister: (token: string) =>
    apiClient
      .delete<MessageResponse>('/api/v1/push-tokens', { params: { token } })
      .then((r) => r.data),
};
