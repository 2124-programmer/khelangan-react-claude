import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Image, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, EmptyState } from '../../components/common';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { formatVenueAddress, venueStatusBadge } from '../../utils/venueUtils';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { useAdminVenuesInfinite, useAdminVenueCounts } from '../../api/hooks/useVenues';
import { useSports } from '../../api/hooks/useSports';
import type { Venue, VenueStatusTone, VenueCounts } from '../../types';

/** Tone → badge background. Text is white for contrast on all tones. */
export const TONE_COLOR: Record<VenueStatusTone, string> = {
  GREEN: colors.success, AMBER: colors.warning, BLUE: colors.info, RED: colors.danger, GRAY: colors.textDim,
};

const VENUE_TABS: { label: string; value: string; countKey?: keyof VenueCounts }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING', countKey: 'pending' },
  { label: 'Changes', value: 'CHANGES_REQUESTED', countKey: 'changesRequested' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const EMPTY_COPY: Record<string, { icon: string; title: string; subtitle: string }> = {
  ALL: { icon: '🏟️', title: 'No venues yet', subtitle: 'Venues will appear here once owners register them.' },
  PENDING: { icon: '✅', title: 'All caught up', subtitle: 'No venues pending approval.' },
  CHANGES_REQUESTED: { icon: '✏️', title: 'Nothing awaiting changes', subtitle: 'Venues sent back will appear here.' },
  APPROVED: { icon: '🏟️', title: 'No approved venues', subtitle: 'Approved venues will appear here.' },
  REJECTED: { icon: '🗂️', title: 'Nothing rejected', subtitle: 'Rejected venues will appear here.' },
};

export default function AdminVenuesScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<string>(route?.params?.tab ?? 'ALL');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const countsQ = useAdminVenueCounts();
  const q = useAdminVenuesInfinite({ status: tab, q: debounced });
  const venues: Venue[] = (q.data?.pages ?? []).flatMap((p) => p.venues);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Venues" onBack={() => navigation.goBack()} />

      {/* Tabs (horizontally scrollable, count badges) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {VENUE_TABS.map((t) => {
          const on = t.value === tab;
          const count = t.countKey ? countsQ.data?.[t.countKey] ?? 0 : 0;
          return (
            <TouchableOpacity
              key={t.value}
              onPress={() => setTab(t.value)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              style={[styles.tab, on && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, on && styles.tabTextActive]}>{t.label}</Text>
              {!!t.countKey && count > 0 && (
                <View style={[styles.tabBadge, on && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, on && { color: colors.white }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Feather name="search" size={18} color={colors.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venue, owner, or address"
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
      </View>

      {q.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={venues}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            debounced.trim()
              ? <EmptyState icon="🔍" title="No venues found" subtitle="No venues match your search." />
              : <EmptyState {...(EMPTY_COPY[tab] ?? EMPTY_COPY.ALL)} />
          }
          renderItem={({ item }) => (
            <VenueCard venue={item} onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })} />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          ListFooterComponent={q.isFetchingNextPage
            ? <ActivityIndicator color={colors.admin} style={{ marginVertical: spacing.md }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const MAX_CHIPS = 3;

function VenueCard({ venue, onPress }: { venue: Venue; onPress: () => void }) {
  const { data: sports = [] } = useSports();
  const badge = venueStatusBadge(venue.status);
  const sportNames = venue.sports
    .map((id) => sports.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => `${s!.icon} ${s!.name}`);
  const shown = sportNames.slice(0, MAX_CHIPS);
  const overflow = sportNames.length - shown.length;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={venue.name}>
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardTop}>
          {venue.coverPhoto ? (
            <Image source={{ uri: venue.coverPhoto }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Text style={styles.thumbPlaceholderText}>{(venue.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.title} numberOfLines={1}>{venue.name}</Text>
              <View style={[styles.badge, { backgroundColor: TONE_COLOR[badge.tone] }]}>
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            </View>
            <Text style={styles.muted} numberOfLines={1}>
              📍 {formatVenueAddress(venue.address, venue.city, venue.state, venue.pincode)}
            </Text>
            <Text style={styles.muted} numberOfLines={1}>
              {venue.courtCount} court{venue.courtCount === 1 ? '' : 's'} · ₹{venue.pricePerHour}/hr
              {venue.submittedAt ? ` · ${formatRelativeTime(venue.submittedAt)}` : ''}
            </Text>
          </View>
        </View>
        {shown.length > 0 && (
          <View style={styles.chipRow}>
            {shown.map((s) => <Text key={s} style={styles.chip}>{s}</Text>)}
            {overflow > 0 && <Text style={[styles.chip, styles.chipMore]}>+{overflow}</Text>}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  tabBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  tabBarContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.medium },
  tabTextActive: { color: colors.white, fontWeight: fontWeight.bold },
  tabBadge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 10, color: colors.white, fontWeight: fontWeight.bold },
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, height: 46,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.textDim },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  muted: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 3 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  chip: { fontSize: 11, color: colors.textMid, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, overflow: 'hidden' },
  chipMore: { color: colors.textDim, fontWeight: fontWeight.semibold },
});
