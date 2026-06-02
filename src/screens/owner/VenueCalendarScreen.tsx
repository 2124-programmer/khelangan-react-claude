import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, EmptyState } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useSlots, useBlockSlot, useBulkBlockSlots } from '../../api/hooks/useSlots';
import { Slot } from '../../types';
import { extractApiError } from '../../api/client';

function buildDateOptions() {
  const opts = [];
  const now = new Date();
  const labels = ['Today', 'Tomorrow'];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    opts.push({ label: labels[i] ?? dayName, date: `${yyyy}-${mm}-${dd}`, day: String(d.getDate()) });
  }
  return opts;
}
const DATES = buildDateOptions();

export default function VenueCalendarScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { data: venue, isLoading: venueLoading } = useVenueDetail(venueId);
  const blockSlot = useBlockSlot();
  const bulkBlock = useBulkBlockSlots();

  const courts = venue?.courts ?? [];
  const [activeCourt, setActiveCourt] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(DATES[0].date);
  const [blockTarget, setBlockTarget] = useState<Slot | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const courtId = activeCourt ?? courts[0]?.id ?? null;
  const { data: slots = [], isLoading: slotsLoading } = useSlots(
    courtId ? Number(courtId) : undefined,
    activeDate
  );

  const handleBlockSlot = async () => {
    if (!blockTarget) return;
    try {
      await blockSlot.mutateAsync(Number(blockTarget.id));
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
    setBlockTarget(null);
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
      <SafeAreaView style={styles.container}>
        <AppHeader title="Manage Calendar" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
              onPress={() => { setActiveCourt(c.id); setBlockTarget(null); }}
              style={[styles.tab, courtId === c.id && styles.tabActive]}
            >
              <Text style={[styles.tabText, courtId === c.id && { color: colors.white }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date tabs */}
        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATES.map((d) => (
            <TouchableOpacity
              key={d.date}
              onPress={() => { setActiveDate(d.date); setBlockTarget(null); }}
              style={[styles.dateCard, activeDate === d.date && styles.dateCardActive]}
            >
              <Text style={[styles.dateLabel, activeDate === d.date && { color: colors.white }]}>{d.label}</Text>
              <Text style={[styles.dateDay, activeDate === d.date && { color: colors.white }]}>{d.day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot grid */}
        <Text style={styles.label}>Slots</Text>
        {slotsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : slots.length === 0 ? (
          <EmptyState icon="📅" title="No slots" subtitle="Try another date" />
        ) : (
          <SlotGrid slots={slots} selectedId={blockTarget?.id} onSelect={setBlockTarget} />
        )}

        {blockTarget && blockTarget.status === 'available' && (
          <AppButton
            label={`Block ${blockTarget.startTime}–${blockTarget.endTime}`}
            variant="danger"
            onPress={() => handleBlockSlot()}
            loading={blockSlot.isPending}
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
  dateCard: { width: 60, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateLabel: { fontSize: fontSize.xs, color: colors.textMid },
  dateDay: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
});
