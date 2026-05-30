import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, SportChip } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useSports } from '../../api/hooks/useSports';
import { useCreateVenue } from '../../api/hooks/useVenues';
import { extractApiError } from '../../api/client';

const STEPS = ['Basic Info', 'Location', 'Sports & Courts', 'Photos', 'Pricing'];
const AMENITIES = ['Parking', 'Floodlights', 'Washroom', 'Drinking Water', 'AC', 'Cafeteria', 'First Aid', 'Equipment Rental'];

export default function AddVenueScreen({ navigation }: any) {
  const { data: sports = [] } = useSports();
  const createVenue = useCreateVenue();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await createVenue.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || 'Nashik',
        description: desc.trim(),
        pricePerSlot: parseInt(price) || 0,
        amenities: selectedAmenities,
        lat: 0,
        lng: 0,
        sportIds: selectedSports.map((id) => Number(id)),
      });
      setDone(true);
    } catch (err) {
      Alert.alert('Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  };
  const back = () => (step > 0 ? setStep(step - 1) : navigation.goBack());

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Add New Venue" onBack={back} />
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
            <AppInput label="City" value={city} onChangeText={setCity} placeholder="Nashik" />
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
              {sports.map((s) => (
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
          <View style={styles.photoBox}>
            <Text style={{ fontSize: 40 }}>📷</Text>
            <Text style={styles.mapText}>Photo upload coming soon</Text>
          </View>
        )}
        {step === 4 && (
          <>
            <AppInput label="Price per Slot (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 900" />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>💡 10% platform commission applies. Venue will be reviewed by admin before going live.</Text>
            </View>
          </>
        )}
        <AppButton
          label={step === STEPS.length - 1 ? (loading ? 'Submitting…' : 'Submit for Approval') : 'Next →'}
          onPress={next}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>

      <ConfirmActionModal
        visible={done}
        title="Venue Submitted!"
        message="Your venue has been submitted for admin review. You'll be notified once it goes live."
        confirmLabel="Done"
        onConfirm={() => { setDone(false); navigation.goBack(); }}
        onDismiss={() => { setDone(false); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  progressItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotText: { fontSize: 11, fontWeight: fontWeight.bold, color: colors.textDim },
  bar: { flex: 1, height: 2, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.primary },
  stepTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  amenityActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  amenityText: { fontSize: fontSize.sm, color: colors.textMid },
  mapBox: { height: 140, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  mapText: { fontSize: fontSize.sm, color: colors.textMid },
  photoBox: { height: 160, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  infoBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  infoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
});
