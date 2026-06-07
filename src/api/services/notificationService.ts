import { apiClient } from '../client';
import type { NotificationDto, BroadcastRequest, MessageResponse, Page, UnreadCountResponse } from '../types';

export const notificationService = {
  list: (params?: { page?: number; size?: number }) =>
    apiClient
      .get<Page<NotificationDto>>('/api/v1/notifications', { params })
      .then((r) => r.data),

  markRead: (id: number) =>
    apiClient
      .patch<NotificationDto>(`/api/v1/notifications/${id}/read`)
      .then((r) => r.data),

  unreadCount: () =>
    apiClient
      .get<UnreadCountResponse>('/api/v1/notifications/unread-count')
      .then((r) => r.data),

  markAllRead: () =>
    apiClient
      .patch<MessageResponse>('/api/v1/notifications/read-all')
      .then((r) => r.data),

  broadcast: (data: BroadcastRequest) =>
    apiClient
      .post<MessageResponse>('/api/v1/admin/notifications/broadcast', data)
      .then((r) => r.data),
};
