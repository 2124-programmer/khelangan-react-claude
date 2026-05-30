import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppHeader, SectionTabBar, EmptyState } from '../../components/common';
import { BookingCard } from '../../components/venue';
import { CancelBookingModal } from '../../modals';
import { BOOKINGS } from '../../data/mockData';
import { Booking, BookingStatus } from '../../types';

export default function MyBookingsScreen({ navigation }: any) {
  const [tab, setTab] = useState<string>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const myBookings = BOOKINGS.filter((b) => b.playerId === 'p1');
  const filtered = myBookings.filter((b) => {
    if (tab === 'upcoming') return b.status === 'confirmed';
    if (tab === 'completed') return b.status === 'completed';
    return b.status === 'cancelled';
  });

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
        {filtered.length === 0 ? (
          <EmptyState icon="📅" title="No bookings here" subtitle="Your bookings will appear in this tab" />
        ) : (
          filtered.map((b) => (
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
        onConfirm={() => setCancelTarget(null)}
        onDismiss={() => setCancelTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
