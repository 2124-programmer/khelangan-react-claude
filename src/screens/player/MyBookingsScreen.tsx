import React, { useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { AppHeader, SectionTabBar, EmptyState, LoadingOverlay} from '../../components/common';
import { BookingCard, GroupedBookingCard } from '../../components/venue';
import { CancelBookingModal, ContactSheet } from '../../modals';
import { useBookings, useCancelBooking, useCancelBookingGroup } from '../../api/hooks/useBookings';
import { Booking, BookingGroup } from '../../types';
import { extractApiError } from '../../api/client';
import { groupBookingList, isGroup, isExpiredPending } from '../../utils/bookingUtils';

const STATUS_MAP: Record<string, string> = {
  pending: 'PENDING',
  upcoming: 'CONFIRMED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

export default function MyBookingsScreen({ navigation }: any) {
  const [tab, setTab] = useState<string>('pending');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [contactTarget, setContactTarget] = useState<{ phone?: string; venueName?: string } | null>(null);
  const cancelBooking = useCancelBooking();
  const cancelBookingGroup = useCancelBookingGroup();

  const { data, isLoading, refetch } = useBookings({ status: STATUS_MAP[tab] });
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };
  const bookings = data?.bookings ?? [];

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    let list = [...bookings];

    if (tab === 'upcoming') {
      // Only show CONFIRMED bookings whose slot is still in the future
      list = list.filter((b) => {
        if (b.date > todayStr) return true;
        if (b.date === todayStr) {
          const [h, m] = (b.endTime ?? '00:00').split(':').map(Number);
          return h * 60 + m > nowMins;
        }
        return false;
      });
      // Soonest first
      list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else if (tab === 'pending') {
      // Hide bookings whose slot has already ended (scheduler will cancel them soon)
      list = list.filter((b) => !isExpiredPending(b, todayStr, nowMins));
      // Soonest first
      list.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else if (tab === 'completed') {
      // Include legacy checked_in rows in the completed view
      list = list.filter((b) => b.status === 'completed' || b.status === 'checked_in');
      list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    } else if (tab === 'cancelled') {
      // Most recent first
      list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
    }

    return list;
  }, [bookings, tab, todayStr]);

  const items = groupBookingList(filteredBookings);

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
    <SafeAreaView edges={['top']} style={styles.container}>
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
            const showContact = tab === 'upcoming' || tab === 'completed';
            const tabCtx = (tab === 'upcoming' || tab === 'completed') ? tab as 'upcoming' | 'completed' : undefined;
            if (isGroup(item)) {
              return (
                <GroupedBookingCard
                  key={item.groupId}
                  group={item}
                  viewAs="player"
                  showContact={showContact}
                  tabCtx={tabCtx}
                  onCancelAll={() => handleCancelGroup(item)}
                  onContact={() => setContactTarget({ phone: item.venuePhone, venueName: item.venueName })}
                />
              );
            }
            return (
              <BookingCard
                key={item.id}
                booking={item}
                showContact={showContact}
                tabCtx={tabCtx}
                onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                onCancel={() => setCancelTarget(item)}
                onReview={() => navigation.navigate('RateReview', { venueId: item.venueId })}
                onRebook={() => navigation.navigate('VenueDetail', { venueId: item.venueId })}
                onContact={() => setContactTarget({ phone: item.venuePhone, venueName: item.venueName })}
              />
            );
          })
        )}
        
      </ScrollView>

      <CancelBookingModal
        visible={!!cancelTarget}
        venueName={cancelTarget?.venueName ?? ''}
        refundAmount={cancelTarget ? Math.round(cancelTarget.amount * 0.5) : 0}
        loading={cancelBooking.isPending}
        onConfirm={handleCancel}
        onDismiss={() => setCancelTarget(null)}
      />

      <ContactSheet
        visible={!!contactTarget}
        phone={contactTarget?.phone}
        venueName={contactTarget?.venueName}
        onClose={() => setContactTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
