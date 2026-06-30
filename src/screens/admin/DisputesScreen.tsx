import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, EmptyState } from '../../components/common';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { useResponsive, gridCellStyle, centeredContent } from '../../responsive';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { useAdminDisputesInfinite, useDisputeStats } from '../../api/hooks/useAdminDisputes';
import type { AdminDisputeRow, AdminDisputeStatus, DisputeCategory, DisputePriority } from '../../types';

export const DISPUTE_STATUS_COLOR: Record<AdminDisputeStatus, string> = {
  OPEN: colors.info, UNDER_REVIEW: colors.warning, NEEDS_INFO: colors.admin,
  RESOLVED: colors.success, DISMISSED: colors.textDim,
};
const DISPUTE_STATUS_LABEL: Record<AdminDisputeStatus, string> = {
  OPEN: 'Open', UNDER_REVIEW: 'Under review', NEEDS_INFO: 'Needs info',
  RESOLVED: 'Resolved', DISMISSED: 'Dismissed',
};
export const PRIORITY_COLOR: Record<DisputePriority, string> = {
  LOW: colors.textDim, MEDIUM: colors.warning, HIGH: colors.danger,
};
export const CATEGORY_ICON: Record<DisputeCategory, string> = {
  OWNER_NO_SHOW: '🚫', OWNER_CANCELLATION: '❌', DOUBLE_BOOKING: '👥', NOT_AS_DESCRIBED: '🔍',
  REFUND_NOT_GIVEN: '💸', OVERCHARGED: '💰', SAFETY_BEHAVIOR: '⚠️', OTHER: '📋',
};

const STATUS_FILTERS: { label: string; value: AdminDisputeStatus }[] = [
  { label: 'Open', value: 'OPEN' },
  { label: 'Under review', value: 'UNDER_REVIEW' },
  { label: 'Needs info', value: 'NEEDS_INFO' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Dismissed', value: 'DISMISSED' },
];
const CATEGORY_FILTERS: { label: string; value: DisputeCategory }[] = [
  { label: 'No-show', value: 'OWNER_NO_SHOW' },
  { label: 'Cancellation', value: 'OWNER_CANCELLATION' },
  { label: 'Double booking', value: 'DOUBLE_BOOKING' },
  { label: 'Not as described', value: 'NOT_AS_DESCRIBED' },
  { label: 'Refund', value: 'REFUND_NOT_GIVEN' },
  { label: 'Overcharged', value: 'OVERCHARGED' },
  { label: 'Safety', value: 'SAFETY_BEHAVIOR' },
  { label: 'Other', value: 'OTHER' },
];
const PRIORITY_FILTERS: { label: string; value: string }[] = [
  { label: 'Any priority', value: '' }, { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' }, { label: 'Low', value: 'LOW' },
];
const ASSIGNED_FILTERS = [
  { label: 'Anyone', value: 'ANYONE' }, { label: 'Me', value: 'ME' }, { label: 'Unassigned', value: 'UNASSIGNED' },
];
const SORTS = [
  { label: 'Priority', value: 'PRIORITY' },
  { label: 'Longest waiting', value: 'LONGEST_WAITING' },
  { label: 'Oldest', value: 'OLDEST' },
  { label: 'Newest', value: 'NEWEST' },
];

export default function DisputesScreen({ navigation }: any) {
  const { columns } = useResponsive();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminDisputeStatus[]>(['OPEN', 'UNDER_REVIEW', 'NEEDS_INFO']);
  const [category, setCategory] = useState<DisputeCategory[]>([]);
  const [priority, setPriority] = useState('');
  const [assigned, setAssigned] = useState('ANYONE');
  const [sort, setSort] = useState('PRIORITY');
  const debounced = useDebounce(search, 300);

  const statsQ = useDisputeStats();
  const q = useAdminDisputesInfinite({ q: debounced, status, category, priority, assigned, sort });
  const disputes: AdminDisputeRow[] = (q.data?.pages ?? []).flatMap((p) => p.disputes);
  const s = statsQ.data;

  const toggleStatus = (v: AdminDisputeStatus) =>
    setStatus((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  const toggleCategory = (v: DisputeCategory) =>
    setCategory((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Disputes" onBack={() => navigation.goBack()} />

      <FlatList
        data={disputes}
        key={`disputes-${columns}`}
        numColumns={columns}
        keyExtractor={(d) => d.disputeId}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, ...centeredContent }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* KPI / SLA strip */}
            <View style={styles.kpiRow}>
              <Kpi label="Open" value={s?.open ?? 0} />
              <Kpi label="Awaiting" value={s?.needsInfo ?? 0} />
              <Kpi label="Overdue" value={s?.overdue ?? 0} accent={colors.danger} />
              <Kpi label="Resolved/wk" value={s?.resolvedThisWeek ?? 0} />
              <Kpi label="Avg hrs" value={s?.avgResolutionHours ?? 0} />
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Feather name="search" size={18} color={colors.textDim} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search booking, player, owner, or venue"
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

            {/* Status (multi) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {STATUS_FILTERS.map((f) => {
                const on = status.includes(f.value);
                return (
                  <TouchableOpacity key={f.value} onPress={() => toggleStatus(f.value)}
                    style={[styles.chip, on && styles.chipActive]}>
                    <Text style={[styles.chipText, on && { color: colors.white }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category (multi) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORY_FILTERS.map((f) => {
                const on = category.includes(f.value);
                return (
                  <TouchableOpacity key={f.value} onPress={() => toggleCategory(f.value)}
                    style={[styles.chipSm, on && styles.chipActive]}>
                    <Text style={[styles.chipSmText, on && { color: colors.white }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Priority + Assigned + Sort (single) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {PRIORITY_FILTERS.map((f) => {
                const on = f.value === priority;
                return (
                  <TouchableOpacity key={f.value || 'any'} onPress={() => setPriority(f.value)}
                    style={[styles.sortChip, on && styles.sortChipActive]}>
                    <Text style={[styles.sortChipText, on && { color: colors.admin }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.sep} />
              {ASSIGNED_FILTERS.map((f) => {
                const on = f.value === assigned;
                return (
                  <TouchableOpacity key={f.value} onPress={() => setAssigned(f.value)}
                    style={[styles.sortChip, on && styles.sortChipActive]}>
                    <Text style={[styles.sortChipText, on && { color: colors.admin }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Text style={styles.sortLabel}>Sort:</Text>
              {SORTS.map((so) => {
                const on = so.value === sort;
                return (
                  <TouchableOpacity key={so.value} onPress={() => setSort(so.value)}
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
              ? <EmptyState icon="🔍" title="No disputes found" subtitle="No disputes match your search." />
              : <EmptyState icon="⚖️" title="No disputes" subtitle="Disputes will appear here." />
        }
        renderItem={({ item }) => {
          const card = <DisputeRowCard row={item} onPress={() => navigation.navigate('DisputeDetail', { disputeId: item.disputeId })} />;
          return columns > 1 ? <View style={gridCellStyle(columns)}>{card}</View> : card;
        }}
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

function DisputeRowCard({ row, onPress }: { row: AdminDisputeRow; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={row.title}>
      <View style={[styles.card, shadow.card]}>
        <Text style={styles.catIcon}>{CATEGORY_ICON[row.category]}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <View style={[styles.priChip, { backgroundColor: PRIORITY_COLOR[row.priority] }]}>
              <Text style={styles.priChipText}>{row.priority}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>{row.title}</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.badge, { backgroundColor: DISPUTE_STATUS_COLOR[row.status] }]}>
              <Text style={styles.badgeText}>{DISPUTE_STATUS_LABEL[row.status]}</Text>
            </View>
          </View>
          <Text style={styles.parties} numberOfLines={1}>{row.playerName} vs {row.ownerName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {row.bookingRef ? `Booking ${row.bookingRef} · ` : ''}
              raised {row.raisedAt ? formatRelativeTime(row.raisedAt) : '—'} · {row.assignedToName ?? 'Unassigned'}
            </Text>
            {row.isOverdue && (
              <View style={styles.overdue}><Text style={styles.overdueText}>Overdue</Text></View>
            )}
          </View>
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
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs + 2, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipSm: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  chipText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.medium },
  chipSmText: { fontSize: fontSize.xs, color: colors.textMid, fontWeight: fontWeight.medium },
  sortLabel: { fontSize: fontSize.xs, color: colors.textDim, alignSelf: 'center', marginRight: 2 },
  sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  sortChipActive: { backgroundColor: colors.primaryLight },
  sortChipText: { fontSize: fontSize.xs, color: colors.textMid },
  sep: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 },
  card: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  catIcon: { fontSize: 22, marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priChip: { paddingHorizontal: spacing.xs + 2, paddingVertical: 1, borderRadius: radius.sm },
  priChipText: { color: colors.white, fontSize: 9, fontWeight: fontWeight.bold },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  parties: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  meta: { flex: 1, fontSize: fontSize.xs, color: colors.textDim },
  overdue: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.xs + 1, paddingVertical: 1 },
  overdueText: { color: colors.white, fontSize: 9, fontWeight: fontWeight.bold },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
});
