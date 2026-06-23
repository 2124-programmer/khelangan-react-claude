import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, EmptyState, AvatarImage } from '../../components/common';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { useOwnersInfinite, useOwnerStats } from '../../api/hooks/useOwners';
import type { OwnerRow, OwnerStatus } from '../../types';

export const OWNER_STATUS_COLOR: Record<OwnerStatus, string> = {
  ACTIVE: colors.success, SUSPENDED: colors.warning, BANNED: colors.danger, DELETED: colors.textDim,
};
const OWNER_STATUS_LABEL: Record<OwnerStatus, string> = {
  ACTIVE: 'Active', SUSPENDED: 'Suspended', BANNED: 'Banned', DELETED: 'Deleted',
};

const SEGMENTS = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Onboarding', value: 'ONBOARDING' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Dormant', value: 'DORMANT' },
  { label: 'Flagged', value: 'FLAGGED' },
  { label: 'Restricted', value: 'RESTRICTED' },
];
const SORTS = [
  { label: 'Recently active', value: 'RECENTLY_ACTIVE' },
  { label: 'Most venues', value: 'MOST_VENUES' },
  { label: 'Highest revenue', value: 'HIGHEST_REVENUE' },
  { label: 'Recently joined', value: 'RECENTLY_JOINED' },
  { label: 'Rating', value: 'RATING' },
  { label: 'Name A–Z', value: 'NAME_ASC' },
];

export default function AdminOwnersScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('ALL');
  const [sort, setSort] = useState('RECENTLY_ACTIVE');
  const debounced = useDebounce(search, 300);

  const statsQ = useOwnerStats();
  const q = useOwnersInfinite({ q: debounced, segment, sort });
  const owners: OwnerRow[] = (q.data?.pages ?? []).flatMap((p) => p.owners);
  const s = statsQ.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Owners" onBack={() => navigation.goBack()} />

      <FlatList
        data={owners}
        keyExtractor={(o) => o.ownerId}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* KPI strip */}
            <View style={styles.kpiRow}>
              <Kpi label="Total" value={s?.totalOwners ?? 0} />
              <Kpi label="New / wk" value={s?.newThisWeek ?? 0} />
              <Kpi label="Active" value={s?.activeOwners ?? 0} />
              <Kpi label="Onboarding" value={s?.onboardingOwners ?? 0} accent={colors.warning} />
              <Kpi label="Flagged" value={s?.flaggedCount ?? 0} accent={colors.danger} />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Feather name="search" size={18} color={colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search name, email, phone, or venue"
                placeholderTextColor={colors.textDim}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search">
                  <Feather name="x-circle" size={18} color={colors.textDim} />
                </TouchableOpacity>
              )}
            </View>

            {/* Segments */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {SEGMENTS.map((seg) => {
                const on = seg.value === segment;
                return (
                  <TouchableOpacity key={seg.value} onPress={() => setSegment(seg.value)}
                    accessibilityRole="button" accessibilityLabel={seg.label}
                    style={[styles.chip, on && styles.chipActive]}>
                    <Text style={[styles.chipText, on && { color: colors.white }]}>{seg.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Sort */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Text style={styles.sortLabel}>Sort:</Text>
              {SORTS.map((so) => {
                const on = so.value === sort;
                return (
                  <TouchableOpacity key={so.value} onPress={() => setSort(so.value)}
                    accessibilityRole="button" accessibilityLabel={so.label}
                    style={[styles.sortChip, on && styles.sortChipActive]}>
                    <Text style={[styles.sortChipText, on && { color: colors.admin }]}>{so.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          q.isLoading ? <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
            : debounced.trim()
              ? <EmptyState icon="🔍" title="No owners found" subtitle="No owners match your search." />
              : <EmptyState icon="🧑‍💼" title="No owners" subtitle="Venue owners will appear here." />
        }
        renderItem={({ item }) => (
          <OwnerRowCard row={item} onPress={() => navigation.navigate('OwnerDetail', { ownerId: item.ownerId })} />
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
        ListFooterComponent={q.isFetchingNextPage
          ? <ActivityIndicator color={colors.admin} style={{ marginVertical: spacing.md }} /> : null}
      />
    </SafeAreaView>
  );
}

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <View style={[styles.kpiCard, shadow.card]}>
      <Text style={[styles.kpiValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function OwnerRowCard({ row, onPress }: { row: OwnerRow; onPress: () => void }) {
  const flagged = row.riskLevel === 'MEDIUM' || row.riskLevel === 'HIGH';
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={row.name}>
      <View style={[styles.card, shadow.card]}>
        <AvatarImage name={row.name} uri={row.avatarUrl ?? undefined} size={44} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
            {row.phoneVerified && <Feather name="check-circle" size={13} color={colors.success} />}
            {flagged && <View style={styles.riskDot} />}
            <View style={{ flex: 1 }} />
            <View style={[styles.badge, { backgroundColor: OWNER_STATUS_COLOR[row.status] }]}>
              <Text style={styles.badgeText}>{OWNER_STATUS_LABEL[row.status]}</Text>
            </View>
          </View>
          <Text style={styles.sub} numberOfLines={1}>
            {row.email ?? '—'}{row.phone ? ` · ${row.phone}` : ''}
          </Text>
          <Text style={styles.signal} numberOfLines={1}>
            {row.liveVenues}/{row.totalVenues} venues · ₹{row.grossBookingValue.toLocaleString('en-IN')}
            {row.rating != null ? ` · ★${row.rating.toFixed(1)}` : ''}
            {row.lastActiveAt ? ` · active ${formatRelativeTime(row.lastActiveAt)}` : ''}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kpiRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  kpiCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  kpiValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  kpiLabel: { fontSize: 9, color: colors.textMid, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, height: 46,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  chipRow: { gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  chipText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.medium },
  sortLabel: { fontSize: fontSize.xs, color: colors.textDim, alignSelf: 'center', marginRight: 2 },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  sortChipActive: { backgroundColor: colors.primaryLight },
  sortChipText: { fontSize: fontSize.xs, color: colors.textMid },
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  riskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  sub: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  signal: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
});
