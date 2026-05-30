import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, SportChip } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { SPORTS } from '../../data/mockData';

const STEPS = ['Basic Info', 'Location', 'Sports & Courts', 'Photos', 'Pricing'];
const AMENITIES = ['Parking', 'Floodlights', 'Washroom', 'Drinking Water', 'AC', 'Cafeteria', 'First Aid', 'Equipment Rental'];

export default function AddVenueScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [done, setDone] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : setDone(true));
  const back = () => (step > 0 ? setStep(step - 1) : navigation.goBack());

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Add New Venue" onBack={back} />

      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.progressItem}>
            <View style={[styles.dot, i <= step && styles.dotActive]}>
              <Text style={[styles.dotText, i <= step && { color: colors.white }]}>{i + 1}</Text>
            </View>
            {i < STEPS.length - 1 && <View style={[styles.bar, i < step && styles.barActive]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepTitle}>{STEPS[step]}</Text>

      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {step === 0 && (
          <>
            <AppInput label="Venue Name" value={name} onChangeText={setName} placeholder="e.g. Green Turf Arena" />
            <AppInput label="Description" value={desc} onChangeText={setDesc} multiline placeholder="Describe your venue..." />
          </>
        )}
        {step === 1 && (
          <>
            <AppInput label="Full Address" value={address} onChangeText={setAddress} multiline placeholder="Street, area, city" />
            <View style={styles.mapBox}>
              <Text style={{ fontSize: 32 }}>📍</Text>
              <Text style={styles.mapText}>Tap to pin location on map</Text>
            </View>
          </>
        )}
        {step === 2 && (
          <>
            <Text style={styles.label}>Select Sports Offered</Text>
            <View style={styles.wrap}>
              {SPORTS.map((s) => (
                <SportChip key={s.id} icon={s.icon} name={s.name} active={selectedSports.includes(s.id)} onPress={() => toggle(selectedSports, setSelectedSports, s.id)} />
              ))}
            </View>
            <Text style={[styles.label, { marginTop: spacing.xl }]}>Amenities</Text>
            <View style={styles.wrap}>
              {AMENITIES.map((a) => (
                <TouchableOpacity key={a} onPress={() => toggle(selectedAmenities, setSelectedAmenities, a)} style={[styles.amenityChip, selectedAmenities.includes(a) && styles.amenityActive]}>
                  <Text style={[styles.amenityText, selectedAmenities.includes(a) && { color: colors.white }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {step === 3 && (
          <>
            <Text style={styles.label}>Upload Photos</Text>
            <View style={styles.photoGrid}>
              {[1, 2, 3, 4].map((i) => (
                <TouchableOpacity key={i} style={styles.photoBox}>
                  <Text style={{ fontSize: 28 }}>📷</Text>
                  <Text style={styles.photoText}>Add</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {step === 4 && (
          <>
            <AppInput label="Price per slot (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="900" />
            <AppInput label="Peak hour price (₹)" value="" onChangeText={() => {}} keyboardType="numeric" placeholder="1200" />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ TurfBook charges 10% commission per booking + ₹20 convenience fee paid by the player.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton label={step === STEPS.length - 1 ? 'Submit for Approval' : 'Next'} onPress={next} />
      </View>

      <ConfirmActionModal
        visible={done}
        title="Venue Submitted! 🎉"
        message="Your venue has been submitted for admin approval. You'll be notified once it goes live (usually within 24 hours)."
        confirmLabel="Done"
        onConfirm={() => { setDone(false); navigation.goBack(); }}
        onDismiss={() => { setDone(false); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  progressItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.owner },
  dotText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textDim },
  bar: { flex: 1, height: 2, backgroundColor: colors.surfaceAlt },
  barActive: { backgroundColor: colors.owner },
  stepTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginBottom: spacing.sm },
  amenityActive: { backgroundColor: colors.owner },
  amenityText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },
  mapBox: { height: 140, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  mapText: { fontSize: fontSize.sm, color: colors.textMid },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoBox: { width: '47%', height: 110, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  photoText: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  infoBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  infoText: { fontSize: fontSize.sm, color: colors.primaryDark, lineHeight: 20 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
