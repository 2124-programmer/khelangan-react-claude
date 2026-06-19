import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, EmptyState, LoadingOverlay } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { SlotLockExpiredModal, BookingRequestModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useSlots } from '../../api/hooks/useSlots';
import { useCourts } from '../../api/hooks/useCourts';
import { useSports } from '../../api/hooks/useSports';
import { useBulkCreateBooking } from '../../api/hooks/useBookings';
import { Slot } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const trimTime = (t: string) => (t.length > 5 ? t.slice(0, 5) : t);

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

// ─── DateRail ─────────────────────────────────────────────────────────────────

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
      contentContainerStyle={{ paddingBottom: spacing.xs }}
    />
  );
}

// ─── CourtTabs ───────────────────────────────────────────────────────────────

function CourtTabs({
  courts,
  activeCourtId,
  onSelect,
}: {
  courts: { id: string; name: string }[];
  activeCourtId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: spacing.md }}
    >
      {courts.map((c) => {
        const active = c.id === activeCourtId;
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[styles.courtTab, active && styles.courtTabActive]}
          >
            <Text style={[styles.courtTabText, active && styles.courtTabTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function SlotSelectionScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const initialCourtId: string | null = route.params.courtId ?? null;
  const initialSportId: string | null = route.params.sportId ?? null;

  const { data: venue, isLoading: venueLoading } = useVenueDetail(venueId);
  const { data: allCourts = [], isLoading: courtsLoading } = useCourts(Number(venueId));
  const { data: sports = [] } = useSports();

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const bulkCreateBooking = useBulkCreateBooking();

  const [activeSportId, setActiveSportId] = useState<string | null>(initialSportId);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(initialCourtId);
  const [activeDate, setActiveDate] = useState(today);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [lockExpired, setLockExpired] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const currentSportId = activeSportId ?? venue?.sports?.[0] ?? null;

  const sportCourts = useMemo(
    () => allCourts.filter((c) => c.sportId === currentSportId),
    [allCourts, currentSportId],
  );

  const effectiveCourtId = selectedCourtId ?? sportCourts[0]?.id ?? null;

  const { data: rawSlots = [], isLoading: slotsLoading } = useSlots(
    effectiveCourtId ? Number(effectiveCourtId) : undefined,
    activeDate,
  );

  const slots = useMemo(
    () =>
      rawSlots.map((sl) => ({
        ...sl,
        startTime: trimTime(sl.startTime),
        endTime: trimTime(sl.endTime),
      })),
    [rawSlots],
  );

  const isToday = activeDate === today;

  const pastSlotIds = useMemo(() => {
    if (!isToday) return new Set<string>();
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return new Set(
      slots
        .filter((sl) => {
          const [h, m] = sl.startTime.split(':').map(Number);
          return h * 60 + m <= nowMins;
        })
        .map((sl) => sl.id),
    );
  }, [isToday, slots]);

  // Prune stale selection whenever slot availability refetches.
  // Defensive: ensures no already-booked/blocked slot survives in selected
  // even if the success-path reset is somehow missed.
  useEffect(() => {
    if (!slots.length) return;
    const availableIds = new Set(slots.filter((s) => s.status === 'available').map((s) => s.id));
    setSelected((prev) => {
      const pruned = prev.filter((s) => availableIds.has(s.id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [slots]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const totalPrice = useMemo(() => selected.reduce((sum, s) => sum + s.price, 0), [selected]);

  const getSportLabel = (sportId: string) => {
    const s = sports.find((sp) => sp.id === sportId);
    return s ? `${s.icon} ${s.name}` : sportId;
  };

  const handleToggleSlot = useCallback((slot: Slot) => {
    if (slot.status !== 'available') return;
    if (pastSlotIds.has(slot.id)) return;

    const alreadySelected = selected.some((s) => s.id === slot.id);

    if (alreadySelected) {
      // Only deselect from an edge to preserve contiguity
      const sorted = [...selected].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (slot.id === first.id || slot.id === last.id) {
        setSelected((prev) => prev.filter((s) => s.id !== slot.id));
      }
      // Tapping a middle slot is a no-op — deselecting it would break contiguity
      return;
    }

    if (selected.length === 0) {
      setSelected([slot]);
      return;
    }

    // Adjacency check using start/end times (handles variable-duration slots)
    const sorted = [...selected].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (slot.endTime === first.startTime || slot.startTime === last.endTime) {
      setSelected((prev) => [...prev, slot]);
      return;
    }

    Alert.alert(
      'Adjacent slots only',
      `You can only select adjacent slots in one booking. To book ${slot.startTime}–${slot.endTime} separately, please complete this booking and raise a new booking request for that slot.`,
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Start new selection here',
          onPress: () => setSelected([slot]),
        },
      ],
    );
  }, [selected, pastSlotIds]);

  const handleSportChange = (sportId: string) => {
    setActiveSportId(sportId);
    setSelectedCourtId(null);
    setSelected([]);
  };

  const handleCourtChange = (courtId: string) => {
    setSelectedCourtId(courtId);
    setSelected([]);
  };

  const handleDateChange = (date: string) => {
    setActiveDate(date);
    setSelected([]);
  };

  if (venueLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Select Slot" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={venueLoading} />
      </SafeAreaView>
    );
  }

  if (!venue) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Select Slot" onBack={() => navigation.goBack()} />
        <EmptyState icon="⚠️" title="Venue not found" subtitle="" />
      </SafeAreaView>
    );
  }

  const loadingSlots = courtsLoading || slotsLoading;

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Select Slot" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.venueName}>{venue.name}</Text>

        {/* Sport selector */}
        <Text style={styles.label}>Sport</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {venue.sports.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => handleSportChange(s)}
              style={[styles.sportTab, currentSportId === s && styles.sportTabActive]}
            >
              <Text style={[styles.sportTabText, currentSportId === s && { color: colors.white }]}>
                {getSportLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date rail — lazy batch of 10 */}
        <Text style={styles.label}>Date</Text>
        <DateRail activeDate={activeDate} onSelect={handleDateChange} />

        {/* Available slots */}
        <Text style={styles.label}>Available Slots</Text>

        {/* Court tabs — only rendered when >1 court for this sport */}
        {sportCourts.length === 1 && (
          <Text style={styles.singleCourtName}>{sportCourts[0].name}</Text>
        )}
        {sportCourts.length > 1 && effectiveCourtId && (
          <CourtTabs
            courts={sportCourts}
            activeCourtId={effectiveCourtId}
            onSelect={handleCourtChange}
          />
        )}

        {loadingSlots ? (
          <LoadingOverlay visible={loadingSlots} />
        ) : slots.length === 0 ? (
          <EmptyState icon="📅" title="No slots available" subtitle="Try another date or court" />
        ) : (
          <SlotGrid slots={slots} selectedIds={selectedIds} onSelect={handleToggleSlot} pastSlotIds={pastSlotIds} />
        )}
      </ScrollView>

      {selected.length > 0 && (
        <View style={[styles.bottomBar, shadow.modal]}>
          <View>
            <Text style={styles.selLabel}>
              {selected.length === 1
                ? `${selected[0].startTime}–${selected[0].endTime}`
                : `${selected.length} slots selected`}
            </Text>
            <Text style={styles.selPrice}>₹{totalPrice}</Text>
          </View>
          <AppButton
            label="Proceed to Book"
            fullWidth={false}
            onPress={() => setShowBookingModal(true)}
            style={{ paddingHorizontal: 24 }}
          />
        </View>
      )}

      <SlotLockExpiredModal visible={lockExpired} onGoBack={() => setLockExpired(false)} />

      <BookingRequestModal
        visible={showBookingModal}
        venueName={venue.name}
        sport={getSportLabel(currentSportId ?? '')}
        date={activeDate}
        slots={selected.map((s) => ({ startTime: s.startTime, endTime: s.endTime, price: s.price }))}
        onConfirm={async () => {
          await bulkCreateBooking.mutateAsync({
            venueId: Number(venue.id),
            courtId: Number(effectiveCourtId),
            date: activeDate,
            startTimes: selected.map((s) => s.startTime),
            sport: currentSportId ?? '',
          });
        }}
        onDismiss={() => {
          setShowBookingModal(false);
          setSelected([]);
        }}
        onGoToBookings={() => {
          setShowBookingModal(false);
          setSelected([]);
          navigation.navigate('Bookings');
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  // Sport tabs (unchanged)
  sportTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  sportTabActive: { backgroundColor: colors.primary },
  sportTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },

  // Date rail
  dateItemWrapper: { alignItems: 'center', marginRight: spacing.sm },
  monthLabel: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textDim,
    marginBottom: 3,
    letterSpacing: 0.4,
  },
  monthLabelGhost: { height: 14, marginBottom: 3 },
  dateCard: {
    width: 64,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateTopLabel: { fontSize: fontSize.xs, color: colors.textMid },
  dateDayNum: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: 2,
  },
  dateTextActive: { color: colors.white },

  // Court tabs
  courtTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courtTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  courtTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  courtTabTextActive: { color: colors.white },

  // Single court label
  singleCourtName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Bottom booking bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selLabel: { fontSize: fontSize.xs, color: colors.textDim },
  selPrice: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
});
