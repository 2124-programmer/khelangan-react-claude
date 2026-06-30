import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/common';
import { centeredContent } from '../../responsive';
import { QueryState } from '../../components/QueryState';
import { useSystemInfo } from '../../api/hooks/useAdminRoles';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type { SystemInfo } from '../../api/types';

/**
 * Super-admin-only "App Configuration" diagnostics. Shows non-sensitive runtime/config metadata
 * (base URL, database, environment, etc.) from GET /api/v1/admin/system-info. No secrets are ever
 * returned by that endpoint. Entry is gated in AdminProfile to user.adminRole === 'SUPER_ADMIN'.
 */

type Group = { title: string; rows: { label: string; value?: string }[] };

function buildGroups(info: SystemInfo): Group[] {
  return [
    {
      title: 'Environment',
      rows: [
        { label: 'App', value: info.appName },
        { label: 'Environment', value: info.environment },
        { label: 'Base URL (BE)', value: info.baseUrl },
        { label: 'Server port', value: info.serverPort },
        { label: 'API base path', value: info.apiBasePath },
      ],
    },
    {
      title: 'Database',
      rows: [
        { label: 'Database name', value: info.databaseName },
        { label: 'Host', value: info.databaseHost },
        { label: 'Engine', value: info.databaseProduct },
      ],
    },
    {
      title: 'Mail & Storage',
      rows: [
        { label: 'Mail host', value: info.mailHost },
        { label: 'Mail from', value: info.mailFrom },
        { label: 'Upload dir', value: info.uploadDir },
      ],
    },
    {
      title: 'Runtime',
      rows: [
        { label: 'Java version', value: info.javaVersion },
        { label: 'Time zone', value: info.serverTimeZone },
        { label: 'Server time', value: info.serverTime },
        { label: 'Uptime', value: info.uptime },
        { label: 'JWT validity', value: info.jwtExpiration },
      ],
    },
  ];
}

export default function AppConfigScreen({ navigation }: any) {
  const query = useSystemInfo();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <AppHeader title="App Configuration" onBack={() => navigation.goBack()} />

      <QueryState query={query} center>
        {(info) => (
          <ScrollView contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}>
            <Text style={s.intro}>
              Read-only diagnostics for this backend. No secrets are shown.
            </Text>
            {buildGroups(info).map((g) => (
              <View key={g.title} style={{ marginBottom: spacing.lg }}>
                <Text style={s.sectionLabel}>{g.title}</Text>
                <View style={[s.group, shadow.card]}>
                  {g.rows.map((r, i) => (
                    <View key={r.label} style={[s.row, i > 0 && s.rowBorder]}>
                      <Text style={s.label}>{r.label}</Text>
                      <Text style={s.value} numberOfLines={2} selectable>
                        {r.value && r.value.length > 0 ? r.value : '—'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </QueryState>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  intro: { fontSize: fontSize.sm, color: colors.textMid, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold,
    textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.xs,
  },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontSize: fontSize.sm, color: colors.textMid, flexShrink: 0 },
  value: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, flex: 1, textAlign: 'right' },
});
