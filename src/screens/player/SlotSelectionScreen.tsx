import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { SlotLockExpiredModal } from '../../modals';
import { VENUES, SLOTS, getSportIcon, getSportName } from '../../data/mockData';
import { Slot } from '../../types';

const DATES = [
  { label: 'Today', date: '2026-06-02', day: 'Mon' },
  { label: 'Tue', date: '2026-06-03', day: '03' },
  { label: 'Wed', date: '2026-06-04', day: '04' },
  { label: 'Thu', date: '2026-06-05', day: '05' },
  { label: 'Fri', date: '2026-06-06', day: '06' },
];

export default function SlotSelectionScreen({ navigation, route }: any) {
  const venue = VENUES.find((v) => v.id === route.params.venueId)!;
  const [activeSport, setActiveSport] = useState(venue.sports[0]);
  const [activeDate, setActiveDate] = useState(DATES[0].date);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [lockExpired, setLockExpired] = useState(false);

  const court = venue.courts.find((c) => c.sportId === activeSport) ?? venue.courts[0];
  const slots = SLOTS[court.id] ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Select Slot" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Text style={styles.venueName}>{venue.name}</Text>

        {/* Sport selector */}
        <Text style={styles.label}>Sport</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {venue.sports.map((s) => (
            <TouchableOpacity key={s} onPress={() => setActiveSport(s)} style={[styles.sportTab, activeSport === s && styles.sportTabActive]}>
              <Text style={[styles.sportTabText, activeSport === s && { color: colors.white }]}>
                {getSportIcon(s)} {getSportName(s)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Date selector */}
        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATES.map((d) => (
            <TouchableOpacity key={d.date} onPress={() => setActiveDate(d.date)} style={[styles.dateCard, activeDate === d.date && styles.dateCardActive]}>
              <Text style={[styles.dateLabel, activeDate === d.date && { color: colors.white }]}>{d.label}</Text>
              <Text style={[styles.dateDay, activeDate === d.date && { color: colors.white }]}>{d.day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.label}>Available Slots</Text>
        <SlotGrid slots={slots} selectedId={selected?.id} onSelect={setSelected} />
      </ScrollView>

      {selected && (
        <View style={[styles.bottomBar, shadow.modal]}>
          <View>
            <Text style={styles.selLabel}>Selected: {selected.startTime}–{selected.endTime}</Text>
            <Text style={styles.selPrice}>₹{selected.price}</Text>
          </View>
          <AppButton
            label="Proceed to Book"
            fullWidth={false}
            onPress={() => navigation.navigate('BookingConfirm', {
              venueId: venue.id, courtId: court.id, slotId: selected.id,
              sport: getSportName(activeSport), date: activeDate, slotPrice: selected.price,
              startTime: selected.startTime, endTime: selected.endTime,
            })}
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
