import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList, ActivityIndicator,
  TouchableOpacity, TextInput, RefreshControl, Linking, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { SportChip, EmptyState, AppHeader, LoadingOverlay } from '../../components/common';
import { VenueCard } from '../../components/venue';
import { useAuth } from '../../store/AuthContext';
import { useSports } from '../../api/hooks/useSports';
import { useInfiniteVenues, useToggleFavorite } from '../../api/hooks/useVenues';
import type { Venue } from '../../types';
import { useLocation } from '../../store/LocationContext';
import { toast } from '../../toast';
import { consumePendingNav } from '../../store/pendingNav';
import { useDebounce } from '../../hooks/useDebounce';
import {
  FilterModal, VenueFilters, DEFAULT_FILTERS, activeFilterCount, filtersToServerParams,
} from '../../components/venue/FilterModal';

export default function PlayerHomeScreen({ navigation }: any) {
  const { user, isLoggedIn } = useAuth();
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [searchFocused, setSearchFocused] = useState(false);
  const [filters, setFilters] = useState<VenueFilters>(DEFAULT_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const filterBadge = activeFilterCount(filters);
  const { location: userLocation, isResolving, refresh: refreshLocation } = useLocation();

  // "Enable" opens device settings on native (the foreground re-check then picks up the change).
  // On web, geolocation only works on a secure origin (https or http://localhost); on a LAN IP over
  // http the browser rejects it silently, so we re-request AND surface guidance instead of no-op'ing.
  const handleEnableLocation = useCallback(() => {
    if (Platform.OS === 'web') {
      refreshLocation();
      const insecure = typeof window !== 'undefined' && window.isSecureContext === false;
      toast.info(
        insecure
          ? 'Your browser blocks location on this address. Open the app at http://localhost to use it.'
          : 'If location stays off, allow it for this site in your browser settings.',
      );
    } else {
      Linking.openSettings().catch(() => refreshLocation());
    }
  }, [refreshLocation]);

  useFocusEffect(
    useCallback(() => {
      const dest = consumePendingNav();
      if (!dest) return;
      const id = setTimeout(() => {
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            { name: dest.screen, params: dest.params as any },
          ],
        });
      }, 0);
      return () => clearTimeout(id);
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
  );

  const requireAuth = (action: () => void) => {
    if (isLoggedIn) { action(); } else { navigation.navigate('Login'); }
  };

  const toggleFavorite = useToggleFavorite();
  const handleToggleFavorite = (v: Venue) => {
    // Favoriting requires a player session — guests are routed to login first.
    requireAuth(() => toggleFavorite.mutate({ venueId: v.id, next: !v.isFavorite }));
  };

  const sportsQuery = useSports();
  const sports = sportsQuery.data ?? [];

  // Search, sport filter, and the filter sheet all drive server-side query params now.
  const serverParams = useMemo(() => ({
    sport: activeSport ?? undefined,
    search: debouncedQuery || undefined,
    ...filtersToServerParams(filters),
  }), [activeSport, debouncedQuery, filters]);

  const venuesQuery = useInfiniteVenues(serverParams);
  const venues = useMemo(
    () => venuesQuery.data?.pages.flatMap((p) => p.venues) ?? [],
    [venuesQuery.data],
  );

  const loadMore = () => {
    if (venuesQuery.hasNextPage && !venuesQuery.isFetchingNextPage) venuesQuery.fetchNextPage();
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([sportsQuery.refetch(), venuesQuery.refetch()]); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader userName={user ? `Hi, ${user.name.split(' ')[0]} !!` : ''} />

      {/* Pinned discovery controls — search, filter, sport chips */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search turfs, sports..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, shadow.card, filterBadge > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilter(true)}
        >
          <Feather name="sliders" size={20} color={filterBadge > 0 ? colors.white : colors.textMid} />
          {filterBadge > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterBadge}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Choose a sport</Text>
      {sportsQuery.isLoading ? (
        <LoadingOverlay visible={sportsQuery.isLoading} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
        >
          <SportChip
            icon=""
            name="All"
            active={activeSport === null}
            onPress={() => setActiveSport(null)}
          />
          {sports.map((s) => (
            <SportChip
              key={s.id}
              icon={s.icon}
              name={s.name}
              active={activeSport === s.id}
              onPress={() => setActiveSport(activeSport === s.id ? null : s.id)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitleInline}>Nearby Venues</Text>
      </View>

      {/* Slim location strip — only when location is off; auto-hides once granted */}
      {!isResolving && !userLocation && (
        <View style={styles.locationStrip}>
          <Text style={styles.locationStripText} numberOfLines={1}>
            📍 Location off — enable to sort by distance
          </Text>
          <TouchableOpacity onPress={handleEnableLocation} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.locationStripBtn}>Enable</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <VenueCard
              venue={item}
              userLocation={userLocation ?? undefined}
              onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
              onToggleFavorite={() => handleToggleFavorite(item)}
            />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={venues.length === 0 ? styles.emptyContent : { paddingBottom: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          venuesQuery.isLoading ? (
            <LoadingOverlay visible />
          ) : venuesQuery.isError ? (
            <EmptyState icon="⚠️" title="Could not load venues" subtitle="Check your connection and try again" />
          ) : (
            <EmptyState icon="🏟" title="No venues found" subtitle="Try a different sport, area, or filter" />
          )
        }
        ListFooterComponent={
          venuesQuery.isFetchingNextPage ? (
            <ActivityIndicator style={{ paddingVertical: spacing.lg }} color={colors.primary} />
          ) : null
        }
      />

      <FilterModal
        visible={showFilter}
        filters={filters}
        onApply={setFilters}
        onClose={() => setShowFilter(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, height: 50,
    borderWidth: 1.5, borderColor: colors.borderDark,
  },
  searchBarFocused: { borderColor: colors.primary, borderWidth: 2 },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  filterBtn: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  filterBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  chipScroll: { flexGrow: 0 },
  chipScrollContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, alignItems: 'center' },
  listHeaderRow: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitleInline: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  cardWrap: { paddingHorizontal: spacing.lg },
  emptyContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  locationStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: spacing.lg, marginTop: spacing.xs, marginBottom: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm,
  },
  locationStripText: { flex: 1, fontSize: fontSize.xs, color: colors.textMid, marginRight: spacing.sm },
  locationStripBtn: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary },
});
