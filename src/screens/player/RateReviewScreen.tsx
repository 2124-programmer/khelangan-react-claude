import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, EmptyState, LoadingOverlay } from '../../components/common';
import { RatingInput } from '../../components/reviews';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useCreateReview } from '../../api/hooks/useReviews';
import { extractApiError } from '../../api/client';

export default function RateReviewScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { data: venue, isLoading } = useVenueDetail(venueId);
  const createReview = useCreateReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');

  const handleSubmit = async () => {
    if (rating < 1) {
      setRatingError('Please select a rating.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Missing comment', 'Please write a short comment about your experience.');
      return;
    }
    try {
      const id = Number(venueId);
      await createReview.mutateAsync({
        venueId: id,
        data: { venueId: id, rating, comment: comment.trim() },
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', extractApiError(err));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Rate & Review" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={isLoading} />
      </SafeAreaView>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Rate & Review" onBack={() => navigation.goBack()} />
        <EmptyState icon="⚠️" title="Venue not found" subtitle="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Rate & Review" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={styles.venueName}>{venue.name}</Text>
        <Text style={styles.sub}>{venue.city}</Text>

        <Text style={styles.label}>Your rating</Text>
        <RatingInput value={rating} onChange={(v) => { setRating(v); setRatingError(''); }} size={36} />
        {ratingError ? <Text style={styles.fieldError}>{ratingError}</Text> : null}

        <Text style={[styles.label, { marginTop: spacing.xl }]}>Your review</Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience…"
          placeholderTextColor={colors.textDim}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{comment.length}/1000</Text>

        <AppButton
          label={createReview.isPending ? 'Submitting…' : 'Submit Review'}
          onPress={handleSubmit}
          disabled={createReview.isPending}
          loading={createReview.isPending}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2, marginBottom: spacing.xl },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  fieldError: { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
  commentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.md, color: colors.text,
    height: 130, textAlignVertical: 'top', backgroundColor: colors.surface,
  },
  charCount: { fontSize: fontSize.xs, color: colors.textDim, textAlign: 'right', marginTop: 4 },
});
