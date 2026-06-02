import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppHeader, SectionTabBar, EmptyState } from '../../components/common';
import { BookingCard } from '../../components/venue';
import { CancelBookingModal } from '../../modals';
import { useBookings, useCancelBooking } from '../../api/hooks/useBookings';
import { Booking } from '../../types';
import { extractApiError } from '../../api/client';

const STATUS_MAP: Record<string, string> = {
  upcoming: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default function MyBookingsScreen({ navigation }: any) {
  const [tab, setTab] = useState<string>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const cancelBooking = useCancelBooking();

  const { data, isLoading } = useBookings({ status: STATUS_MAP[tab] });
  const bookings = data?.bookings ?? [];

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelBooking.mutateAsync(Number(cancelTarget.id));
    } catch (err) {
      Alert.alert('Cancel Failed', extractApiError(err));
    } finally {
      setCancelTarget(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Bookings" />
      <SectionTabBar
        tabs={[
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : bookings.length === 0 ? (
          <EmptyState icon="📅" title="No bookings here" subtitle="Your bookings will appear in this tab" />
        ) : (
          bookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })}
              onCancel={() => setCancelTarget(b)}
              onReview={() => navigation.navigate('RateReview', { bookingId: b.id })}
              onRebook={() => navigation.navigate('VenueDetail', { venueId: b.venueId })}
            />
          ))
        )}
      </ScrollView>

      <CancelBookingModal
        visible={!!cancelTarget}
        venueName={cancelTarget?.venueName ?? ''}
        refundAmount={cancelTarget ? Math.round(cancelTarget.amount * 0.5) : 0}
        onConfirm={handleCancel}
        onDismiss={() => setCancelTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
