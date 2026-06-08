import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';
import { AppHeader, SportChip, EmptyState, LoadingOverlay } from '../../components/common';
import { VenueCard } from '../../components/venue';
import { useSports } from '../../api/hooks/useSports';
import { useVenues } from '../../api/hooks/useVenues';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocation } from '../../store/LocationContext';

export default function SearchScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);
  const { location: userLocation } = useLocation();

  const { data: sports = [] } = useSports();
  const { data, isLoading, refetch } = useVenues(
    debouncedQuery || activeSport
      ? { search: debouncedQuery || undefined, sport: activeSport || undefined }
      : undefined
  );
  const results = data?.venues ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Search" onBack={() => navigation.goBack()} 
        onBellPress={() => requireAuth(() => navigation.navigate('Notifications'))}/>
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search turfs, areas..."
            placeholderTextColor={colors.textDim}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
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

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : (
          <>
            <Text style={styles.resultCount}>{results.length} venues found</Text>
            {results.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No venues found"
                subtitle="Try adjusting your search or filters"
              />
            ) : (
              results.map((v) => (
                <VenueCard
                  key={v.id}
                  venue={v}
                  userLocation={userLocation ?? undefined}
                  onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, paddingBottom: spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 48, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text },
  filterBtn: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chipRow: { flexGrow: 0, paddingVertical: spacing.sm },
  resultCount: { fontSize: fontSize.sm, color: colors.textMid, marginBottom: spacing.md },
});
