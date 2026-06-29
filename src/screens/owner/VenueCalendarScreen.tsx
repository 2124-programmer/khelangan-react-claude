import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, EmptyState, LoadingOverlay } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useSlots, useBlockSlotByTime, useBlockSelectedSlots, useBulkBlockSlots } from '../../api/hooks/useSlots';
import { Slot } from '../../types';
import { extractApiError } from '../../api/client';

const BATCH = 10;

type DateItem = {
  date: string;
  topLabel: string;
  dayNum: string;
  month: string;
};

function buildDates(count: number): DateItem[] {
  const items: DateItem[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const month = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    items.push({
      date: `${yyyy}-${mm}-${dd}`,
      topLabel: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekday,
      dayNum: String(d.getDate()),
      month,
    });
  }
  return items;
}

function DateRail({
  activeDate,
  onSelect,
}: {
  activeDate: string;
  onSelect: (d: string) => void;
}) {
  const [count, setCount] = useState(BATCH);
  const dates = useMemo(() => buildDates(count), [count]);
  const loadMore = useCallback(() => setCount((c) => c + BATCH), []);

  const renderItem = useCallback(
    ({ item, index }: { item: DateItem; index: number }) => {
      const active = item.date === activeDate;
      const showMonth = index === 0 || dates[index - 1].month !== item.month;
      return (
        <View style={styles.dateItemWrapper}>
          {showMonth ? (
            <Text style={styles.monthLabel}>{item.month}</Text>
          ) : (
            <View style={styles.monthLabelGhost} />
          )}
          <TouchableOpacity
            onPress={() => onSelect(item.date)}
            style={[styles.dateCard, active && styles.dateCardActive]}
          >
            <Text style={[styles.dateTopLabel, active && styles.dateTextActive]}>
              {item.topLabel}
            </Text>
            <Text style={[styles.dateDayNum, active && styles.dateTextActive]}>
              {item.dayNum}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
    [activeDate, dates, onSelect],
  );

  return (
    <FlatList
      horizontal
      data={dates}
      keyExtractor={(item) => item.date}
      renderItem={renderItem}
      extraData={activeDate}
      showsHorizontalScrollIndicator={false}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingBottom: 4 }}
    />
  );
}

export default function VenueCalendarScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { data: venue, isLoading: venueLoading, isError: venueError } = useVenueDetail(venueId);
  const blockSlotByTime = useBlockSlotByTime();
  const blockSelected = useBlockSelectedSlots();
  const bulkBlock = useBulkBlockSlots();

  const courts = venue?.courts ?? [];
  const [activeCourt, setActiveCourt] = useState<string | null>(null);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [activeDate, setActiveDate] = useState(today);
  const [blockTargets, setBlockTargets] = useState<Slot[]>([]);
  const [showBulk, setShowBulk] = useState(false);

  const courtId = activeCourt ?? courts[0]?.id ?? null;
  const { data: slots = [], isLoading: slotsLoading } = useSlots(
    courtId ? Number(courtId) : undefined,
    activeDate
  );

  const selectedIds = useMemo(() => new Set(blockTargets.map((s) => s.id)), [blockTargets]);

  const handleToggleSlot = useCallback((slot: Slot) => {
    if (slot.status !== 'available') return;
    setBlockTargets((prev) =>
      prev.some((s) => s.id === slot.id)
        ? prev.filter((s) => s.id !== slot.id)
        : [...prev, slot],
    );
  }, []);

  const handleBlockSelected = async () => {
    if (!courtId || blockTargets.length === 0) return;
    try {
      if (blockTargets.length === 1) {
        const t = blockTargets[0];
        await blockSlotByTime.mutateAsync({
          courtId: Number(t.courtId),
          date: t.date,
          startTime: t.startTime,
          endTime: t.endTime,
        });
      } else {
        await blockSelected.mutateAsync({
          courtId: Number(courtId),
          data: { date: activeDate, startTimes: blockTargets.map((t) => t.startTime) },
        });
      }
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
    setBlockTargets([]);
  };

  const handleBulkBlock = async () => {
    if (!courtId) return;
    try {
      await bulkBlock.mutateAsync({ courtId: Number(courtId), data: { date: activeDate } });
      setShowBulk(false);
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
      setShowBulk(false);
    }
  };

  if (venueLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Manage Calendar" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={venueLoading} />
      </SafeAreaView>
    );
  }

  if (venueError || !venue) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Manage Calendar" onBack={() => navigation.goBack()} />
        <View style={styles.centeredState}>
          <EmptyState
            icon="🏟️"
            title="Venue not found"
            subtitle="This venue could not be loaded. It may have been removed or you may not have access."
          />
          <AppButton label="Go to Venues" variant="ghost" onPress={() => navigation.navigate('VenuesTab')} style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (courts.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <AppHeader title="Manage Calendar" onBack={() => navigation.goBack()} />
        <View style={styles.centeredState}>
          <EmptyState
            icon="🎾"
            title="No courts available"
            subtitle="Add a court to this venue before managing the calendar."
          />
          <AppButton label="Go to Venues" variant="ghost" onPress={() => navigation.navigate('VenuesTab')} style={styles.stateButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Manage Calendar"
        onBack={() => navigation.goBack()}
        rightLabel="Bulk Block"
        onRightPress={() => setShowBulk(true)}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.venueName}>{venue?.name}</Text>

        {/* Court tabs */}
        <Text style={styles.label}>Court</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {courts.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => { setActiveCourt(c.id); setBlockTargets([]); }}
              style={[styles.tab, courtId === c.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, courtId === c.id && { color: colors.white }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date rail — lazy infinite scroll */}
        <Text style={styles.label}>Date</Text>
        <DateRail
          activeDate={activeDate}
          onSelect={(d) => { setActiveDate(d); setBlockTargets([]); }}
        />

        {/* Slot grid */}
        <Text style={styles.label}>Slots</Text>
        {slotsLoading ? (
          <LoadingOverlay visible={slotsLoading} />
        ) : slots.length === 0 ? (
          <EmptyState icon="📅" title="No slots" subtitle="Try another date" />
        ) : (
          <SlotGrid slots={slots} selectedIds={selectedIds} onSelect={handleToggleSlot} />
        )}

        {blockTargets.length > 0 && (
          <AppButton
            label={blockTargets.length === 1
              ? `Block ${blockTargets[0].startTime}–${blockTargets[0].endTime}`
              : `Block ${blockTargets.length} slots`}
            variant="danger"
            onPress={handleBlockSelected}
            loading={blockSlotByTime.isPending || blockSelected.isPending}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </ScrollView>

      <ConfirmActionModal
        visible={showBulk}
        title="Block all slots?"
        message={`All available slots for ${activeDate} will be blocked.`}
        confirmLabel="Block All"
        danger
        onConfirm={handleBulkBlock}
        onDismiss={() => setShowBulk(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginTop: spacing.lg, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  dateItemWrapper: { alignItems: 'center', marginRight: spacing.sm },
  monthLabel: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.textDim, marginBottom: 3, letterSpacing: 0.4 },
  monthLabelGhost: { height: 14, marginBottom: 3 },
  dateCard: { width: 64, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateTopLabel: { fontSize: fontSize.xs, color: colors.textMid },
  dateDayNum: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  dateTextActive: { color: colors.white },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  stateButton: { marginTop: spacing.lg, width: 160 },
});
