import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { SportChip, EmptyState, AppHeader, LoadingOverlay } from '../../components/common';
import { VenueCard } from '../../components/venue';
import { useAuth } from '../../store/AuthContext';
import { useSports } from '../../api/hooks/useSports';
import { useVenues } from '../../api/hooks/useVenues';
import { useLocation } from '../../store/LocationContext';
import { consumePendingNav } from '../../store/pendingNav';
import { useDebounce } from '../../hooks/useDebounce';
import {
  FilterModal, VenueFilters, DEFAULT_FILTERS, activeFilterCount, applyFilters,
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
  const { location: userLocation, permission, isResolving } = useLocation();

  useFocusEffect(
    useCallback(() => {
      const dest = consumePendingNav();
      if (!dest) return;
      // setTimeout(0) defers until after the navigator's state machine has
      // finished initializing. navigation.reset() writes stack state directly
      // and cannot be dropped the way navigate() can during init.
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

  const sportsQuery = useSports();
  const venuesQuery = useVenues(
    activeSport || debouncedQuery
      ? { sport: activeSport ?? undefined, search: debouncedQuery || undefined }
      : undefined
  );

  const sports = sportsQuery.data ?? [];
  const venues = useMemo(
    () => applyFilters(venuesQuery.data?.venues ?? [], filters),
    [venuesQuery.data, filters]
  );
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([sportsQuery.refetch(), venuesQuery.refetch()]); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        userName={user ? `Hi, ${user.name.split(' ')[0]} !!` : ''}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >

        {/* Search bar */}
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

        {/* Banner */}
        {/* <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('Offers')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Get 20% OFF</Text>
            <Text style={styles.bannerSub}>On your next booking. Code: TURF20</Text>
          </View>
          <Text style={{ fontSize: 40 }}>🎉</Text>
        </TouchableOpacity> */}

        {/* Sport filter */}
        <Text style={styles.sectionTitle}>Choose a sport</Text>
        {sportsQuery.isLoading ? (
          <LoadingOverlay visible={sportsQuery.isLoading}/>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingLeft: spacing.lg }}
            contentContainerStyle={{ paddingRight: spacing.lg }}
          >
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

        {/* Venues */}
        <Text style={styles.sectionTitle}>Nearby Venues</Text>

        {/* Location status — visible indicator for debugging */}
        <Text style={styles.locationStatus}>
          {isResolving
            ? '📍 Getting your location...'
            : permission === 'denied'
            ? '📍 Location access denied — enable in browser/device settings'
            : userLocation
            ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
            : '📍 Location unavailable'}
        </Text>

        <View style={{ paddingHorizontal: spacing.lg }}>
          {venuesQuery.isLoading ? (
            <LoadingOverlay visible={venuesQuery.isLoading} />
          ) : venuesQuery.isError ? (
            <EmptyState
              icon="⚠️"
              title="Could not load venues"
              subtitle="Check your connection and try again"
            />
          ) : venues.length === 0 ? (
            <EmptyState icon="🏟" title="No venues found" subtitle="Try a different sport or area" />
          ) : (
            venues.map((v) => (
              <VenueCard
                key={v.id}
                venue={v}
                userLocation={userLocation ?? undefined}
                onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })}
              />
            ))
          )}
        </View>
      </ScrollView>

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
  searchBarFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  filterBtn: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  filterBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  bannerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },
  bannerSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  locationStatus: { fontSize: fontSize.xs, color: colors.textDim, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
});
