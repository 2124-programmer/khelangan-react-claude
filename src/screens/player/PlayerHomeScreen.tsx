import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { SportChip, AvatarImage, EmptyState } from '../../components/common';
import { VenueCard } from '../../components/venue';
import { useAuth } from '../../store/AuthContext';
import { useSports } from '../../api/hooks/useSports';
import { useVenues } from '../../api/hooks/useVenues';

export default function PlayerHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const sportsQuery = useSports();
  const venuesQuery = useVenues(
    activeSport ? { sport: activeSport } : undefined
  );

  const sports = sportsQuery.data ?? [];
  const venues = venuesQuery.data?.venues ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={styles.location}>📍 Nashik, Maharashtra</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.bell}><Text style={{ fontSize: 20 }}>🔔</Text></View>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TouchableOpacity
          style={[styles.searchBar, shadow.card]}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search turfs, sports, areas...</Text>
        </TouchableOpacity>

        {/* Banner */}
        <TouchableOpacity style={styles.banner} onPress={() => navigation.navigate('Offers')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Get 20% OFF</Text>
            <Text style={styles.bannerSub}>On your next booking. Code: TURF20</Text>
          </View>
          <Text style={{ fontSize: 40 }}>🎉</Text>
        </TouchableOpacity>

        {/* Sport filter */}
        <Text style={styles.sectionTitle}>Choose a sport</Text>
        {sportsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ margin: spacing.lg }} />
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
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Nearby Venues</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          {venuesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
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
                onPress={() => navigation.navigate('VenueDetail', { venueId: v.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  greeting: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  location: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  bell: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, marginHorizontal: spacing.lg, borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 50 },
  searchPlaceholder: { color: colors.textDim, fontSize: fontSize.md },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg },
  bannerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white },
  bannerSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  seeAll: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, paddingHorizontal: spacing.lg },
});
