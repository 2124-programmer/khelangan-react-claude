import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton, AppInput, SportChip, HourPickerDropdown } from '../../components/common';
import { VenueImagePicker, PickedImage } from '../../components/venue';
import { ConfirmActionModal } from '../../modals';
import { useSports } from '../../api/hooks/useSports';
import { useCreateVenue, useUploadVenueImage } from '../../api/hooks/useVenues';
import { extractApiError } from '../../api/client';
import { parseLatLng } from '../../utils/locationUtils';

// ─── Constants ─────────────────────────────────────────────────────────────

const STEPS = ['Basic Info', 'Address', 'Contact', 'Sports', 'Hours', 'Pricing', 'Photos'];

const AMENITIES = [
  'Parking', 'Floodlights', 'Washroom', 'Drinking Water',
  'AC', 'Cafeteria', 'First Aid', 'Equipment Rental', 'Locker Room',
];

function formatHour(h24: string): string {
  const h = parseInt(h24.split(':')[0], 10);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, '0')}:00 ${period}`;
}

// ─── Field error ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <Text style={styles.fieldError}>{msg}</Text>;
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AddVenueScreen({ navigation }: any) {
  const { data: sports = [] } = useSports();
  const createVenue = useCreateVenue();
  const uploadImage = useUploadVenueImage();

  // Wizard state
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [successVenueId, setSuccessVenueId] = useState<number | null>(null);

  // Step 0 — Basic Info
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  // Step 1 — Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [latlong, setLatlong] = useState('');

  // Step 2 — Contact
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 3 — Sports & Amenities
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Step 4 — Hours
  const [openTime, setOpenTime] = useState('05:00');
  const [closeTime, setCloseTime] = useState('23:00');

  // Step 5 — Pricing
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Step 6 — Photos
  const [images, setImages] = useState<PickedImage[]>([]);

  // Inline field errors (per step)
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Toggle helpers ────────────────────────────────────────────────────

  const toggleItem = (arr: string[], set: (v: string[]) => void, val: string) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  // ─── Per-step validation ───────────────────────────────────────────────

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};

    if (s === 0) {
      if (!name.trim()) errs.name = 'Venue name is required';
    }
    if (s === 1) {
      if (!address.trim()) errs.address = 'Address is required';
      if (!city.trim()) errs.city = 'City is required';
      if (pincode && !/^\d{6}$/.test(pincode)) errs.pincode = 'Pincode must be exactly 6 digits';
      if (latlong.trim() && !parseLatLng(latlong.trim()))
        errs.latlong = 'Enter valid coordinates like "20.015164, 73.84228"';
    }
    if (s === 2) {
      if (!phone.trim()) errs.phone = 'Contact phone is required';
      else if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email address';
    }
    if (s === 3) {
      if (selectedSports.length === 0) errs.sports = 'Select at least one sport';
    }
    if (s === 4) {
      const open  = parseInt(openTime.split(':')[0], 10);
      const close = parseInt(closeTime.split(':')[0], 10);
      if (close <= open) errs.hours = 'Closing time must be after opening time';
    }
    if (s === 5) {
      if (!price.trim()) errs.price = 'Price per hour is required';
      else if (isNaN(Number(price)) || Number(price) < 0) errs.price = 'Enter a valid price (₹ 0 or more)';
    }
    // Step 6 — photos are optional (min 1 recommended but not enforced as hard block)

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  const next = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const back = () => {
    setErrors({});
    if (step > 0) setStep(step - 1);
    else navigation.goBack();
  };

  // ─── Submit ───────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true);
    try {
      // Upload each picked image and collect server URLs
      const uploadedUrls: string[] = [];
      for (const img of images) {
        const res = await uploadImage.mutateAsync(img.uri);
        uploadedUrls.push(res.url);
      }

      const primaryImg = images.find((i) => i.isPrimary);
      const primaryIdx = primaryImg ? images.indexOf(primaryImg) : 0;
      const coverPhoto = uploadedUrls[primaryIdx] ?? uploadedUrls[0];

      const coords = latlong.trim() ? parseLatLng(latlong.trim()) : null;

      const result = await createVenue.mutateAsync({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        description: desc.trim() || undefined,
        contactPhone: phone.trim(),
        contactEmail: email.trim() || undefined,
        openTime,
        closeTime,
        pricePerHour: parseInt(price, 10),
        amenities: selectedAmenities,
        sportIds: selectedSports.map((id) => Number(id)),
        isActive,
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
        coverPhoto,
        photos: uploadedUrls,
      });
      setSuccessVenueId(result.id ?? null);
    } catch (err) {
      Alert.alert('Submission Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Add New Venue" onBack={back} />

      {/* Progress bar */}
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

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* ── Step 0: Basic Info ─────────────────────────────────────── */}
        {step === 0 && (
          <>
            <AppInput
              label="Venue Name *"
              value={name}
              onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
              placeholder="e.g. Green Turf Arena"
            />
            <FieldError msg={errors.name} />
            <AppInput
              label="Description (optional)"
              value={desc}
              onChangeText={setDesc}
              multiline
              placeholder="Describe your venue — facilities, surface, etc."
            />
          </>
        )}

        {/* ── Step 1: Address ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <AppInput
              label="Street Address *"
              value={address}
              onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: '' })); }}
              multiline
              placeholder="Plot no., street, area"
            />
            <FieldError msg={errors.address} />
            <AppInput
              label="City *"
              value={city}
              onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: '' })); }}
              placeholder="e.g. Nashik"
            />
            <FieldError msg={errors.city} />
            <AppInput
              label="State"
              value={state}
              onChangeText={setState}
              placeholder="e.g. Maharashtra"
            />
            <AppInput
              label="Pincode (6 digits)"
              value={pincode}
              onChangeText={(v) => { setPincode(v); setErrors((e) => ({ ...e, pincode: '' })); }}
              keyboardType="numeric"
              placeholder="e.g. 422001"
              maxLength={6}
            />
            <FieldError msg={errors.pincode} />
            <AppInput
              label="Location Coordinates (optional)"
              value={latlong}
              onChangeText={(v) => { setLatlong(v); setErrors((e) => ({ ...e, latlong: '' })); }}
              placeholder="e.g. 20.015164, 73.84228"
              keyboardType="default"
              autoCapitalize="none"
            />
            <FieldError msg={errors.latlong} />
          </>
        )}

        {/* ── Step 2: Contact ────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <AppInput
              label="Contact Phone *"
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: '' })); }}
              keyboardType="phone-pad"
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            <FieldError msg={errors.phone} />
            <AppInput
              label="Contact Email (optional)"
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="owner@example.com"
            />
            <FieldError msg={errors.email} />
          </>
        )}

        {/* ── Step 3: Sports & Amenities ─────────────────────────────── */}
        {step === 3 && (
          <>
            <Text style={styles.fieldLabel}>Sports Offered *</Text>
            <View style={styles.wrap}>
              {sports.map((s) => (
                <SportChip
                  key={s.id}
                  icon={s.icon}
                  name={s.name}
                  active={selectedSports.includes(s.id)}
                  onPress={() => {
                    toggleItem(selectedSports, setSelectedSports, s.id);
                    setErrors((e) => ({ ...e, sports: '' }));
                  }}
                />
              ))}
            </View>
            <FieldError msg={errors.sports} />

            <Text style={[styles.fieldLabel, { marginTop: spacing.xl }]}>Amenities</Text>
            <View style={styles.wrap}>
              {AMENITIES.map((a) => (
                <TouchableOpacity
                  key={a}
                  onPress={() => toggleItem(selectedAmenities, setSelectedAmenities, a)}
                  style={[styles.chip, selectedAmenities.includes(a) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedAmenities.includes(a) && { color: colors.white }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ── Step 4: Operating Hours ─────────────────────────────────── */}
        {step === 4 && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Select the first and last bookable hours. Minutes are always :00 — slots run hour-by-hour.
              </Text>
            </View>

            <HourPickerDropdown
              label="Opening Hour *"
              value={openTime}
              onChange={(v) => {
                setOpenTime(v);
                setErrors((e) => ({ ...e, hours: '' }));
              }}
              minHour={0}
              maxHour={22}
            />

            <HourPickerDropdown
              label="Closing Hour *"
              value={closeTime}
              onChange={(v) => {
                setCloseTime(v);
                setErrors((e) => ({ ...e, hours: '' }));
              }}
              minHour={parseInt(openTime.split(':')[0], 10) + 1}
              maxHour={23}
            />

            <View style={styles.hoursPreview}>
              <Text style={styles.hoursPreviewText}>
                Window: {formatHour(openTime)} – {formatHour(closeTime)}
                {'  '}({parseInt(closeTime.split(':')[0], 10) - parseInt(openTime.split(':')[0], 10)} slots/day)
              </Text>
            </View>
            <FieldError msg={errors.hours} />
          </>
        )}

        {/* ── Step 5: Pricing & Active ─────────────────────────────────── */}
        {step === 5 && (
          <>
            <AppInput
              label="Price per Hour (₹) *"
              value={price}
              onChangeText={(v) => { setPrice(v); setErrors((e) => ({ ...e, price: '' })); }}
              keyboardType="numeric"
              placeholder="e.g. 800"
            />
            <FieldError msg={errors.price} />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Venue is Active</Text>
                <Text style={styles.toggleSub}>Inactive venues are hidden from players</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Your venue is saved as a draft. Add your courts (free), then submit it for admin
                review from My Venues — it goes live on a 30-day free trial once approved.
              </Text>
            </View>
          </>
        )}

        {/* ── Step 6: Photos ────────────────────────────────────────────── */}
        {step === 6 && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Add up to 3 photos. The system will crop each to 16:9 and compress to ~200–300 KB.
                The first / starred photo becomes the venue cover used in search results.
              </Text>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <VenueImagePicker
                images={images}
                onChange={setImages}
                uploading={loading}
              />
            </View>
          </>
        )}

        <AppButton
          label={step === STEPS.length - 1
            ? (loading ? 'Uploading & Saving…' : 'Save Venue')
            : 'Next →'}
          onPress={next}
          loading={loading}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>

      {/* Success modal → route to Add Court */}
      <ConfirmActionModal
        visible={successVenueId !== null}
        title="Venue Saved as Draft"
        message="Add your courts next (free). Then submit for approval from My Venues to go live."
        confirmLabel="Add Courts"
        onConfirm={() => {
          const vid = successVenueId;
          setSuccessVenueId(null);
          navigation.replace('CourtManagement', { venueId: vid });
        }}
        onDismiss={() => {
          setSuccessVenueId(null);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  progressItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.textDim },
  bar: { flex: 1, height: 2, backgroundColor: colors.border },
  barActive: { backgroundColor: colors.primary },

  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },

  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
    marginBottom: spacing.sm,
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: '#e53935',
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },

  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textMid },

  // Hour picker
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  hourChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourChipText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },

  hoursPreview: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  hoursPreviewText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.semibold },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  toggleSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },

  infoBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  infoText: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
});
