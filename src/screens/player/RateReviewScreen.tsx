import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, StarRating, EmptyState, LoadingOverlay } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useBookingDetail } from '../../api/hooks/useBookings';
import { useCreateReview } from '../../api/hooks/useReviews';
import { extractApiError } from '../../api/client';

export default function RateReviewScreen({ navigation, route }: any) {
  const bookingId: string = route.params.bookingId;
  const { data: booking, isLoading } = useBookingDetail(bookingId);
  const createReview = useCreateReview();

  const [overall, setOverall] = useState(0);
  const [cleanliness, setCleanliness] = useState(0);
  const [ground, setGround] = useState(0);
  const [staff, setStaff] = useState(0);
  const [comment, setComment] = useState('');
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!booking) return;
    try {
      await createReview.mutateAsync({
        bookingId: Number(bookingId),
        rating: overall,
        comment,
        cleanliness,
        ground,
        staff,
      });
      setConfirm(false);
      navigation.goBack();
    } catch (err) {
      setConfirm(false);
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

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Rate & Review" onBack={() => navigation.goBack()} />
        <EmptyState icon="⚠️" title="Booking not found" subtitle="" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Rate & Review" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.venueName}>{booking.venueName}</Text>
        <Text style={styles.sub}>{booking.sport} · {booking.date}</Text>

        <View style={styles.overallBox}>
          <Text style={styles.label}>Overall Rating</Text>
          <StarRating value={overall} size={40} interactive onChange={setOverall} />
        </View>

        <CategoryRow label="Cleanliness" value={cleanliness} onChange={setCleanliness} />
        <CategoryRow label="Ground Quality" value={ground} onChange={setGround} />
        <CategoryRow label="Staff Behaviour" value={staff} onChange={setStaff} />

        <Text style={[styles.label, { marginTop: spacing.xl }]}>Write a review</Text>
        <AppInput
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience..."
          multiline
        />

        <AppButton
          label={createReview.isPending ? 'Submitting…' : 'Submit Review'}
          onPress={() => setConfirm(true)}
          disabled={overall === 0}
          loading={createReview.isPending}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>

      <ConfirmActionModal
        visible={confirm}
        title="Post Review?"
        message="Your review will be visible to other players and the venue owner."
        confirmLabel="Post"
        onConfirm={handleSubmit}
        onDismiss={() => setConfirm(false)}
      />
    </SafeAreaView>
  );
}

function CategoryRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.catRow}>
      <Text style={styles.catLabel}>{label}</Text>
      <StarRating value={value} size={22} interactive onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  overallBox: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, marginTop: spacing.xl, gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border },
  catLabel: { fontSize: fontSize.md, color: colors.text },
});
