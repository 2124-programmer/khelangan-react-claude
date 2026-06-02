import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, EmptyState } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { SlotLockExpiredModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useSlots } from '../../api/hooks/useSlots';
import { useSports } from '../../api/hooks/useSports';
import { Slot } from '../../types';

function buildDateOptions() {
  const opts = [];
  const now = new Date();
  const labels = ['Today', 'Tomorrow'];
  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    opts.push({
      label: labels[i] ?? dayName,
      date: `${yyyy}-${mm}-${dd}`,
      day: String(d.getDate()),
    });
  }
  return opts;
}

const DATES = buildDateOptions();

export default function SlotSelectionScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const { data: venue, isLoading: venueLoading } = useVenueDetail(venueId);
  const { data: sports = [] } = useSports();

  const [activeSportId, setActiveSportId] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState(DATES[0].date);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [lockExpired, setLockExpired] = useState(false);

  const currentSportId = activeSportId ?? venue?.sports?.[0] ?? null;
  const court = venue?.courts?.find((c) => c.sportId === currentSportId) ?? venue?.courts?.[0];

  const { data: slots = [], isLoading: slotsLoading } = useSlots(
    court ? Number(court.id) : undefined,
    activeDate
  );

  const getSportLabel = (sportId: string) => {
    const s = sports.find((sp) => sp.id === sportId);
    return s ? `${s.icon} ${s.name}` : sportId;
  };

  if (venueLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Select Slot" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
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
              onPress={() => { setActiveSportId(s); setSelected(null); }}
              style={[styles.sportTab, currentSportId === s && styles.sportTabActive]}
            >
              <Text style={[styles.sportTabText, currentSportId === s && { color: colors.white }]}>
                {getSportLabel(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date selector */}
        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATES.map((d) => (
            <TouchableOpacity
              key={d.date}
              onPress={() => { setActiveDate(d.date); setSelected(null); }}
              style={[styles.dateCard, activeDate === d.date && styles.dateCardActive]}
            >
              <Text style={[styles.dateLabel, activeDate === d.date && { color: colors.white }]}>
                {d.label}
              </Text>
              <Text style={[styles.dateDay, activeDate === d.date && { color: colors.white }]}>
                {d.day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.label}>Available Slots</Text>
        {slotsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : slots.length === 0 ? (
          <EmptyState icon="📅" title="No slots available" subtitle="Try another date or court" />
        ) : (
          <SlotGrid slots={slots} selectedId={selected?.id} onSelect={setSelected} />
        )}
      </ScrollView>

      {selected && (
        <View style={[styles.bottomBar, shadow.modal]}>
          <View>
            <Text style={styles.selLabel}>
              Selected: {selected.startTime}–{selected.endTime}
            </Text>
            <Text style={styles.selPrice}>₹{selected.price}</Text>
          </View>
          <AppButton
            label="Proceed to Book"
            fullWidth={false}
            onPress={() =>
              navigation.navigate('BookingConfirm', {
                venueId: venue.id,
                courtId: court?.id,
                slotId: selected.id,
                sport: getSportLabel(currentSportId ?? ''),
                date: activeDate,
                slotPrice: selected.price,
                startTime: selected.startTime,
                endTime: selected.endTime,
              })
            }
            style={{ paddingHorizontal: 24 }}
          />
        </View>
      )}

      <SlotLockExpiredModal visible={lockExpired} onGoBack={() => setLockExpired(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginTop: spacing.xl, marginBottom: spacing.md },
  sportTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginRight: spacing.sm },
  sportTabActive: { backgroundColor: colors.primary },
  sportTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  dateCard: { width: 60, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dateCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateLabel: { fontSize: fontSize.xs, color: colors.textMid },
  dateDay: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  selLabel: { fontSize: fontSize.xs, color: colors.textDim },
  selPrice: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
});
