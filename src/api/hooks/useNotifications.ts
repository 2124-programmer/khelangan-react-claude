import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';
import { adaptNotification } from '../adapters';
import { useAuth } from '../../store/AuthContext';
import type { BroadcastRequest, UnreadCountResponse } from '../types';
import type { AppNotification } from '../../types';

export const NOTIFICATIONS_KEY = ['notifications'] as const;
// 60s poll cadence. Optimistic mark-read patches keep the badge live between polls, so a
// slower interval (vs the old 30s) halves background data/battery cost without staleness.
export const NOTIFICATION_POLL_MS = 60_000;

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
    refetchInterval: NOTIFICATION_POLL_MS, // poll every 60s for new notifications
    refetchIntervalInBackground: false,    // don't poll the full list while app is backgrounded
    staleTime: NOTIFICATION_POLL_MS,       // reuse cache across Notifications-screen remounts
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
    // The bell lives in every screen header, so each navigation mounts a fresh observer.
    // With staleTime 0 that re-fetched the count on every screen change. Treat the count as
    // fresh for one poll cycle so remounts reuse the cache; the 30s poll + mark-read cache
    // patches keep it current.
    staleTime: NOTIFICATION_POLL_MS,
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
