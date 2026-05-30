import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, EmptyState } from '../../components/common';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../api/hooks/useNotifications';

const ICONS: Record<string, string> = {
  booking: '✅', payment: '💰', offer: '🎉', review: '⭐', system: '🔔',
};

export default function NotificationsScreen({ navigation }: any) {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightLabel="Mark all read"
        onRightPress={() => markAllRead.mutate()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : notifications.length === 0 ? (
          <EmptyState icon="🔔" title="No notifications yet" subtitle="" />
        ) : (
          notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[styles.row, !n.isRead && styles.unread]}
              onPress={() => {
                if (!n.isRead) markRead.mutate(Number(n.id));
              }}
            >
              <View style={styles.iconBox}>
                <Text style={{ fontSize: 20 }}>{ICONS[n.type] ?? '🔔'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>{n.date}</Text>
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
  row: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  body: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2, lineHeight: 18 },
  time: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 4 },
});
