import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { toast } from '../../toast';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useMyVenueReview, useCreateReview, useUpdateReview, useDeleteReview } from '../../api/hooks/useReviews';
import type { Review } from '../../types';

/* ─── RatingStars ────────────────────────────────────────────────────────── */
interface RatingStarsProps {
  value: number;
  size?: number;
}
export function RatingStars({ value, size = 14 }: RatingStarsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: size, color: i <= Math.round(value) ? colors.star : colors.border }}>
          ★
        </Text>
      ))}
    </View>
  );
}

/* ─── RatingInput ────────────────────────────────────────────────────────── */
interface RatingInputProps {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}
export function RatingInput({ value, onChange, size = 32 }: RatingInputProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onChange(i)} activeOpacity={0.6} hitSlop={8}>
          <Text style={{ fontSize: size, color: i <= value ? colors.star : colors.border }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ─── RatingSummary ──────────────────────────────────────────────────────── */
interface RatingSummaryProps {
  ratingAverage: number | null;
  ratingCount: number;
  variant?: 'compact' | 'full';
  onPress?: () => void;
}
export function RatingSummary({ ratingAverage, ratingCount, variant = 'compact', onPress }: RatingSummaryProps) {
  const hasRatings = ratingAverage !== null && ratingCount > 0;

  if (variant === 'compact') {
    if (!hasRatings) {
      return (
        <View style={styles.newPill}>
          <Text style={styles.newPillText}>New</Text>
        </View>
      );
    }
    const inner = (
      <View style={styles.compactBadge}>
        <Text style={styles.compactStar}>★</Text>
        <Text style={styles.compactAvg}>{ratingAverage!.toFixed(1)}</Text>
        <Text style={styles.compactCount}>({ratingCount})</Text>
      </View>
    );
    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>
    ) : inner;
  }

  // full variant
  if (!hasRatings) {
    return (
      <View style={styles.fullEmpty}>
        <Text style={styles.fullEmptyText}>No ratings yet</Text>
      </View>
    );
  }
  const inner = (
    <View style={styles.fullBadge}>
      <Text style={styles.fullStar}>★</Text>
      <Text style={styles.fullAvg}>{ratingAverage!.toFixed(1)}</Text>
      <Text style={styles.fullCount}> · {ratingCount} review{ratingCount !== 1 ? 's' : ''}</Text>
    </View>
  );
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{inner}</TouchableOpacity>
  ) : inner;
}

/* ─── ReviewCard ─────────────────────────────────────────────────────────── */
interface ReviewCardProps {
  review: Review;
  showVenueName?: boolean;
}
export function ReviewCard({ review, showVenueName = false }: ReviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardAuthor}>{review.authorName}</Text>
          {showVenueName && review.venueName ? (
            <Text style={styles.cardVenueName}>{review.venueName}</Text>
          ) : null}
        </View>
        <Text style={styles.cardDate}>{formatRelativeTime(review.createdAt)}</Text>
      </View>
      <RatingStars value={review.rating} size={13} />
      <Text style={styles.cardComment}>{review.comment}</Text>
    </View>
  );
}

/* ─── ReviewsEmptyState ──────────────────────────────────────────────────── */
interface ReviewsEmptyStateProps {
  ctaLabel?: string;
  onCtaPress?: () => void;
}
export function ReviewsEmptyState({ ctaLabel, onCtaPress }: ReviewsEmptyStateProps) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyStar}>★</Text>
      <Text style={styles.emptyTitle}>No reviews yet</Text>
      <Text style={styles.emptyBody}>Be the first to leave a review.</Text>
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity style={styles.emptyBtn} onPress={onCtaPress} activeOpacity={0.8}>
          <Text style={styles.emptyBtnText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ─── WriteReviewSheet ───────────────────────────────────────────────────── */
interface WriteReviewSheetProps {
  venueId: number;
  visible: boolean;
  onClose: () => void;
}
export function WriteReviewSheet({ venueId, visible, onClose }: WriteReviewSheetProps) {
  const { data: existing, isLoading } = useMyVenueReview(venueId);
  const isEdit = !!existing;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [commentError, setCommentError] = useState('');

  const createMutation = useCreateReview();
  const updateMutation = useUpdateReview();
  const deleteMutation = useDeleteReview();

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  useEffect(() => {
    if (visible) {
      setRating(existing?.rating ?? 0);
      setComment(existing?.comment ?? '');
      setRatingError('');
      setCommentError('');
    }
  }, [visible, existing]);

  function validate(): boolean {
    let ok = true;
    if (rating < 1 || rating > 5) {
      setRatingError('Please select a rating.');
      ok = false;
    } else {
      setRatingError('');
    }
    const trimmed = comment.trim();
    if (trimmed.length < 1) {
      setCommentError('Comment cannot be empty.');
      ok = false;
    } else if (trimmed.length > 1000) {
      setCommentError('Comment is too long (max 1000 chars).');
      ok = false;
    } else {
      setCommentError('');
    }
    return ok;
  }

  async function handleSubmit() {
    if (!validate()) return;
    const data = { rating, comment: comment.trim() };
    try {
      if (isEdit && existing) {
        await updateMutation.mutateAsync({ reviewId: Number(existing.id), venueId, data });
        toast.success('Review updated');
      } else {
        await createMutation.mutateAsync({ venueId, data: { ...data, venueId } });
        toast.success('Review submitted');
      }
      onClose();
    } catch {
      // Global MutationCache.onError handles the error toast — sheet stays open
    }
  }

  async function handleDelete() {
    if (!existing) return;
    try {
      await deleteMutation.mutateAsync({ reviewId: Number(existing.id), venueId });
      toast.success('Review deleted');
      onClose();
    } catch {
      // Global handler toasts the error
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{isEdit ? 'Edit your review' : 'Write a review'}</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetLabel}>Rating</Text>
            <RatingInput value={rating} onChange={(v) => { setRating(v); setRatingError(''); }} />
            {ratingError ? <Text style={styles.fieldError}>{ratingError}</Text> : null}

            <Text style={[styles.sheetLabel, { marginTop: spacing.lg }]}>Comment</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={(t) => { setComment(t); setCommentError(''); }}
              placeholder="Share your experience…"
              placeholderTextColor={colors.textDim}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/1000</Text>
            {commentError ? <Text style={styles.fieldError}>{commentError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, busy && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy && !deleteMutation.isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>{isEdit ? 'Save changes' : 'Submit review'}</Text>
              )}
            </TouchableOpacity>

            {isEdit ? (
              <TouchableOpacity
                style={[styles.deleteBtn, deleteMutation.isPending && { opacity: 0.6 }]}
                onPress={handleDelete}
                disabled={busy}
                activeOpacity={0.85}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color={colors.danger} />
                ) : (
                  <Text style={styles.deleteBtnText}>Delete review</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  // RatingSummary compact
  newPill: {
    backgroundColor: '#E0F7E9', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radius.pill,
  },
  newPillText: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold },
  compactBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  compactStar: { fontSize: 12, color: colors.star },
  compactAvg: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  compactCount: { fontSize: fontSize.xs, color: colors.textMid },

  // RatingSummary full
  fullEmpty: {},
  fullEmptyText: { fontSize: fontSize.sm, color: colors.textDim },
  fullBadge: { flexDirection: 'row', alignItems: 'center' },
  fullStar: { fontSize: 16, color: colors.star },
  fullAvg: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginLeft: 4 },
  fullCount: { fontSize: fontSize.sm, color: colors.textMid },

  // ReviewCard
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg,
    marginBottom: spacing.md, ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  cardAuthor: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  cardVenueName: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  cardDate: { fontSize: fontSize.xs, color: colors.textDim },
  cardComment: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 8, lineHeight: 20 },

  // ReviewsEmptyState
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyStar: { fontSize: 48, color: colors.star, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: 6 },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMid, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.pill,
  },
  emptyBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },

  // WriteReviewSheet
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl + 8, paddingTop: spacing.md,
    maxHeight: '80%',
    ...shadow.modal,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  sheetLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  fieldError: { fontSize: fontSize.xs, color: colors.danger, marginTop: 4 },
  commentInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.md, color: colors.text,
    height: 120, textAlignVertical: 'top',
  },
  charCount: { fontSize: fontSize.xs, color: colors.textDim, textAlign: 'right', marginTop: 4 },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    height: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl,
  },
  submitBtnText: { color: colors.white, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  deleteBtn: {
    borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    height: 46, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md,
  },
  deleteBtnText: { color: colors.danger, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
});
