import React, { useState } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { AppHeader } from '../../components/common';
import { centeredContent } from '../../responsive';
import { ReviewCard, ReviewsEmptyState, WriteReviewSheet, RatingSummary } from '../../components/reviews';
import { useVenueReviews } from '../../api/hooks/useReviews';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { colors, spacing, fontSize, fontWeight } from '../../theme';
import type { Review } from '../../types';

export default function VenueReviewsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { venueId } = route.params as { venueId: string };
  const numericId = Number(venueId);

  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: venueData } = useVenueDetail(venueId);
  const venue = venueData;

  const { data, isLoading, isError } = useVenueReviews(venueId, { page });
  const reviews: Review[] = data?.reviews ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <View style={styles.container}>
      <AppHeader title="Reviews" onBack={() => navigation.goBack()} />

      {venue ? (
        <View style={styles.summary}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <RatingSummary
            ratingAverage={venue.ratingAverage}
            ratingCount={venue.ratingCount}
            variant="full"
          />
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <Text style={styles.errorText}>Failed to load reviews.</Text>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={[styles.list, centeredContent]}
          renderItem={({ item }) => <ReviewCard review={item} />}
          ListEmptyComponent={
            <ReviewsEmptyState
              ctaLabel="Write a review"
              onCtaPress={() => setSheetOpen(true)}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                {page > 0 ? (
                  <Text style={styles.pageBtn} onPress={() => setPage((p) => p - 1)}>‹ Prev</Text>
                ) : <View />}
                <Text style={styles.pageInfo}>Page {page + 1} / {totalPages}</Text>
                {page < totalPages - 1 ? (
                  <Text style={styles.pageBtn} onPress={() => setPage((p) => p + 1)}>Next ›</Text>
                ) : <View />}
              </View>
            ) : null
          }
        />
      )}

      <WriteReviewSheet
        venueId={numericId}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  summary: { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#111827', marginBottom: 4 },
  list: { padding: spacing.lg },
  errorText: { textAlign: 'center', marginTop: 40, color: colors.danger },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  pageBtn: { fontSize: fontSize.md, color: colors.primary, fontWeight: fontWeight.semibold },
  pageInfo: { fontSize: fontSize.sm, color: '#6B7280' },
});
