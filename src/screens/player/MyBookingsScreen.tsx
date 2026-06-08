import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { colors, spacing } from '../../theme';
import { AppHeader, SectionTabBar, EmptyState, LoadingOverlay} from '../../components/common';
import { BookingCard, GroupedBookingCard } from '../../components/venue';
import { CancelBookingModal } from '../../modals';
import { useBookings, useCancelBooking, useCancelBookingGroup } from '../../api/hooks/useBookings';
import { Booking, BookingGroup, BookingStatus } from '../../types';
import { extractApiError } from '../../api/client';

const STATUS_MAP: Record<string, string> = {
  pending: 'PENDING',
  upcoming: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

// Derive an overall status from all bookings in the group (worst-case wins)
function deriveGroupStatus(bookings: Booking[]): BookingStatus {
  if (bookings.every((b) => b.status === 'pending')) return 'pending';
  if (bookings.every((b) => b.status === 'confirmed')) return 'confirmed';
  if (bookings.every((b) => b.status === 'cancelled')) return 'cancelled';
  if (bookings.every((b) => b.status === 'completed')) return 'completed';
  if (bookings.some((b) => b.status === 'confirmed')) return 'confirmed';
  return bookings[0].status;
}

type BookingListItem = Booking | BookingGroup;

function groupBookingList(bookings: Booking[]): BookingListItem[] {
  const groupMap = new Map<string, Booking[]>();
  const seenGroups = new Set<string>();
  const result: BookingListItem[] = [];

  for (const b of bookings) {
    if (b.groupId) {
      if (!groupMap.has(b.groupId)) groupMap.set(b.groupId, []);
      groupMap.get(b.groupId)!.push(b);
    }
  }

  for (const b of bookings) {
    if (!b.groupId) {
      result.push(b);
    } else if (!seenGroups.has(b.groupId)) {
      seenGroups.add(b.groupId);
      const grouped = groupMap.get(b.groupId)!.sort((a, c) =>
        a.startTime.localeCompare(c.startTime),
      );
      const group: BookingGroup = {
        groupId: b.groupId,
        bookings: grouped,
        venueName: b.venueName,
        courtName: b.courtName,
        sport: b.sport,
        date: b.date,
        totalAmount: grouped.reduce((sum, g) => sum + g.amount, 0),
        status: deriveGroupStatus(grouped),
        playerId: b.playerId,
        playerName: b.playerName,
      };
      result.push(group);
    }
  }

  return result;
}

function isGroup(item: BookingListItem): item is BookingGroup {
  return 'groupId' in item && 'bookings' in item;
}

export default function MyBookingsScreen({ navigation }: any) {
  const [tab, setTab] = useState<string>('pending');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const cancelBooking = useCancelBooking();
  const cancelBookingGroup = useCancelBookingGroup();

  const { data, isLoading, refetch } = useBookings({ status: STATUS_MAP[tab] });
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };
  const bookings = data?.bookings ?? [];
  const items = groupBookingList(bookings);

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

  const handleCancelGroup = useCallback(async (group: BookingGroup) => {
    try {
      await cancelBookingGroup.mutateAsync(group.groupId);
    } catch (err) {
      Alert.alert('Cancel Failed', extractApiError(err));
    }
  }, [cancelBookingGroup]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Bookings" onBack={() => navigation.goBack()} />
      <SectionTabBar
        tabs={[
          { label: 'Pending', value: 'pending' },
          { label: 'Upcoming', value: 'upcoming' },
          { label: 'Completed', value: 'completed' },
          { label: 'Cancelled', value: 'cancelled' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : items.length === 0 ? (
          <EmptyState icon="📅" title="No bookings here" subtitle="Your bookings will appear in this tab" />
        ) : (
          items.map((item) => {
            if (isGroup(item)) {
              return (
                <GroupedBookingCard
                  key={item.groupId}
                  group={item}
                  viewAs="player"
                  onCancelAll={() => handleCancelGroup(item)}
                />
              );
            }
            return (
              <BookingCard
                key={item.id}
                booking={item}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                onCancel={() => setCancelTarget(item)}
                onReview={() => navigation.navigate('RateReview', { bookingId: item.id })}
                onRebook={() => navigation.navigate('VenueDetail', { venueId: item.venueId })}
              />
            );
          })
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
