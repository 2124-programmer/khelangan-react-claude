import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { adaptNotification } from '../adapters';
import { useAuth } from '../../store/AuthContext';
import type { BroadcastRequest, UnreadCountResponse } from '../types';
import type { AppNotification } from '../../types';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const NOTIFICATION_POLL_MS = 30_000;

/** Shape cached by useNotifications(). */
type NotificationsPage = { notifications: AppNotification[]; totalPages: number; totalElements: number };
const UNREAD_KEY = [...NOTIFICATIONS_KEY, 'unread-count'] as const;

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
    // Marking read is a trivial state flip — patch the cached list + count in place instead of
    // refetching them. Callers only invoke this for unread items, so decrement-by-one is safe.
    // Avoids a list+count GET (and its CORS preflight) on every read, e.g. per sibling on Accept.
    onSuccess: (_data, id) => {
      qc.setQueriesData<NotificationsPage>({ queryKey: NOTIFICATIONS_KEY }, (old) =>
        old?.notifications
          ? { ...old, notifications: old.notifications.map((n) => (n.id === String(id) ? { ...n, isRead: true } : n)) }
          : old);
      qc.setQueryData<UnreadCountResponse>(UNREAD_KEY, (old) =>
        old ? { ...old, count: Math.max(0, (old.count ?? 0) - 1) } : old);
    },
    // If the server rejected the change, resync from the source of truth.
    onError: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      qc.setQueriesData<NotificationsPage>({ queryKey: NOTIFICATIONS_KEY }, (old) =>
        old?.notifications
          ? { ...old, notifications: old.notifications.map((n) => ({ ...n, isRead: true })) }
          : old);
      qc.setQueryData<UnreadCountResponse>(UNREAD_KEY, (old) => (old ? { ...old, count: 0 } : old));
    },
    onError: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: (data: BroadcastRequest) => notificationService.broadcast(data),
  });
}
