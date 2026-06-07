import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, EmptyState } from '../../components/common';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../api/hooks/useNotifications';
import { formatRelativeTime, useNow } from '../../utils/dateUtils';

function getNotifIcon(type: string, title: string): string {
  if (type === 'booking') {
    const t = title.toLowerCase();
    if (t.includes('reject')) return '❌';
    if (t.includes('cancel')) return '🚫';
    if (t.includes('confirmed') || t.includes('confirm')) return '✅';
    if (t.includes('request')) return '📋';
    return '📋';
  }
  const MAP: Record<string, string> = { payment: '💰', offer: '🎉', review: '⭐', system: '🔔' };
  return MAP[type] ?? '🔔';
}


export default function NotificationsScreen({ navigation }: any) {
  useNow();
  const { data, isLoading, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={unreadCount > 0 ? `Notifications (${unreadCount})` : 'Notifications'}
        onBack={() => navigation.goBack()}
        rightLabel={unreadCount > 0 ? 'Mark all read' : undefined}
        onRightPress={unreadCount > 0 ? () => markAllRead.mutate() : undefined}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications yet" subtitle="You're all caught up!" />
        ) : (
          notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              activeOpacity={0.85}
              style={[styles.row, !n.isRead && styles.unread]}
              onPress={() => { if (!n.isRead) markRead.mutate(Number(n.id)); }}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 20 }}>{getNotifIcon(n.type, n.title)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>{formatRelativeTime(n.date)}</Text>
              </View>
              {!n.isRead && <View style={styles.dot} />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  row: {
    flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2, lineHeight: 18 },
  time: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
});
