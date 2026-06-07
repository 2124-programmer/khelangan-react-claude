import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { adaptNotification } from '../adapters';
import { useAuth } from '../../store/AuthContext';
import type { BroadcastRequest } from '../types';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const NOTIFICATION_POLL_MS = 30_000;

export function useNotifications(params?: { page?: number }) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, params],
    queryFn: async () => {
      const page = await notificationService.list(params);
      return {
        notifications: page.content.map(adaptNotification),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
    refetchInterval: 60_000, // poll every 60s for new notifications
  });
}

export function useUnreadNotifications() {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: () => notificationService.unreadCount(),
    enabled: isLoggedIn,
    refetchInterval: NOTIFICATION_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: (data: BroadcastRequest) => notificationService.broadcast(data),
  });
}
