import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton } from '../../components/common';
import { SlotGrid } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { VENUES, SLOTS } from '../../data/mockData';
import { Slot } from '../../types';

const DATES = [
  { label: 'Today', date: '2026-06-02', day: 'Mon' },
  { label: 'Tue', date: '2026-06-03', day: '03' },
  { label: 'Wed', date: '2026-06-04', day: '04' },
  { label: 'Thu', date: '2026-06-05', day: '05' },
];

export default function VenueCalendarScreen({ navigation, route }: any) {
  const venue = VENUES.find((v) => v.id === route.params.venueId)!;
  const [activeCourt, setActiveCourt] = useState(venue.courts[0].id);
  const [activeDate, setActiveDate] = useState(DATES[0].date);
  const [blockTarget, setBlockTarget] = useState<Slot | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const slots = SLOTS[activeCourt] ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Manage Calendar" onBack={() => navigation.goBack()} rightLabel="Bulk Block" onRightPress={() => setShowBulk(true)} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.venueName}>{venue.name}</Text>

        <Text style={styles.label}>Court</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {venue.courts.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setActiveCourt(c.id)} style={[styles.tab, activeCourt === c.id && styles.tabActive]}>
              <Text style={[styles.tabText, activeCourt === c.id && { color: colors.white }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DATES.map((d) => (
            <TouchableOpacity key={d.date} onPress={() => setActiveDate(d.date)} style={[styles.dateCard, activeDate === d.date && styles.dateCardActive]}>
              <Text style={[styles.dateLabel, activeDate === d.date && { color: colors.white }]}>{d.label}</Text>
              <Text style={[styles.dateDay, activeDate === d.date && { color: colors.white }]}>{d.day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Tap an available slot to block it</Text>
        <SlotGrid slots={slots} mode="owner" onSelect={(s) => s.status === 'available' && setBlockTarget(s)} />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>💡 Blocked slots won't be bookable by players. Use this for maintenance or private events.</Text>
        </View>
      </ScrollView>

      <ConfirmActionModal
        visible={!!blockTarget}
        title="Block this slot?"
        message={`Block the ${blockTarget?.startTime}–${blockTarget?.endTime} slot? Players won't be able to book it.`}
        confirmLabel="Block Slot"
        onConfirm={() => setBlockTarget(null)}
        onDismiss={() => setBlockTarget(null)}
      />
      <ConfirmActionModal
        visible={showBulk}
        title="Bulk Block Slots"
        message="Block all slots for the selected date? Useful for holidays or maintenance days."
        confirmLabel="Block All"
        danger
        onConfirm={() => setShowBulk(false)}
        onDismiss={() => setShowBulk(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginTop: spacing.lg, marginBottom: spacing.md },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.owner },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  dateCard: { width: 60, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dateCardActive: { backgroundColor: colors.owner, borderColor: colors.owner },
  dateLabel: { fontSize: fontSize.xs, color: colors.textMid },
  dateDay: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: 2 },
  infoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.xl },
  infoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
});
