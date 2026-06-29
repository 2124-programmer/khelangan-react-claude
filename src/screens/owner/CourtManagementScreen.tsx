import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput, EmptyState, HourPickerDropdown, LoadingOverlay } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useCourts, useCreateCourt, useUpdateCourt, useDeleteCourt } from '../../api/hooks/useCourts';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useSports } from '../../api/hooks/useSports';
import { extractApiError, extractCourtLimit } from '../../api/client';
import { toast } from '../../toast';
import type { Court } from '../../types';

// ─── Inherit badge ────────────────────────────────────────────────────────────

function InheritBadge({ label }: { label: string }) {
  return (
    <View style={styles.inheritBadge}>
      <Text style={styles.inheritBadgeText}>Inherits venue: {label}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CourtManagementScreen({ navigation, route }: any) {
  const venueId: number = Number(route.params.venueId);

  const { data: courts = [], isLoading } = useCourts(venueId);
  const { data: venue } = useVenueDetail(venueId);
  const { data: sports = [] } = useSports();
  const createCourt = useCreateCourt(venueId);
  const updateCourt = useUpdateCourt(venueId);
  const deleteCourt = useDeleteCourt(venueId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Court | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('');
  const [type, setType] = useState('');

  // Time override
  const [useVenueHours, setUseVenueHours] = useState(true);
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('22:00');

  // Price override
  const [useVenuePrice, setUseVenuePrice] = useState(true);
  const [price, setPrice] = useState('');

  const [isActive, setIsActive] = useState(true);

  // Venue defaults (for display)
  const venueOpenTime  = venue?.openTime  ?? '05:00';
  const venueCloseTime = venue?.closeTime ?? '23:00';
  const venuePricePerHour = venue?.pricePerHour ?? 0;

  // Sport options filtered to venue's offered sports
  const venueSportIds = (venue?.sports ?? []);
  const venueSports = sports.filter((s) => venueSportIds.includes(s.id));

  // ─── Open form ────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    resetForm();
    setShowForm(true);
  }

  function openEdit(court: Court) {
    setEditing(court);
    setName(court.name);
    setSportId(court.sportId);
    setType(court.type ?? '');
    const hasCustomHours = court.openTime !== null || court.closeTime !== null;
    setUseVenueHours(!hasCustomHours);
    setOpenTime(court.openTime ?? court.effectiveOpenTime ?? venueOpenTime);
    setCloseTime(court.closeTime ?? court.effectiveCloseTime ?? venueCloseTime);
    const hasCustomPrice = court.pricePerHour !== null;
    setUseVenuePrice(!hasCustomPrice);
    setPrice(court.pricePerHour !== null ? String(court.pricePerHour) : '');
    setIsActive(court.isActive);
    setErrors({});
    setShowForm(true);
  }

  function resetForm() {
    setName('');
    setSportId(venueSports[0]?.id ?? sports[0]?.id ?? '');
    setType('');
    setUseVenueHours(true);
    setOpenTime(venueOpenTime);
    setCloseTime(venueCloseTime);
    setUseVenuePrice(true);
    setPrice('');
    setIsActive(true);
    setErrors({});
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
  }

  // ─── Validate ─────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Court name is required';
    if (!sportId) errs.sport = 'Select a sport';
    if (!useVenueHours) {
      const open  = parseInt(openTime.split(':')[0], 10);
      const close = parseInt(closeTime.split(':')[0], 10);
      const vOpen  = parseInt(venueOpenTime.split(':')[0], 10);
      const vClose = parseInt(venueCloseTime.split(':')[0], 10);
      if (close <= open) errs.hours = 'Closing hour must be after opening hour';
      else if (open < vOpen) errs.hours = `Opening hour cannot be before venue opening (${venueOpenTime})`;
      else if (close > vClose) errs.hours = `Closing hour cannot be after venue closing (${venueCloseTime})`;
    }
    if (!useVenuePrice) {
      if (!price.trim()) errs.price = 'Enter a price';
      else if (isNaN(Number(price)) || Number(price) < 0) errs.price = 'Price must be ₹0 or more';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── Save ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sportId: Number(sportId),
        type: type.trim() || undefined,
        openTime:  useVenueHours ? null : openTime,
        closeTime: useVenueHours ? null : closeTime,
        pricePerHour: useVenuePrice ? null : Number(price),
        isActive,
      };
      if (editing) {
        await updateCourt.mutateAsync({ courtId: Number(editing.id), data: payload });
      } else {
        await createCourt.mutateAsync(payload);
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      // A plan court-limit block offers a direct upgrade path instead of a dead-end error.
      const limit = extractCourtLimit(err);
      if (limit) {
        toast.error(
          `Your ${limit.planName ?? 'current'} plan allows ${limit.allowed} courts (you have ${limit.current}).`,
          { title: 'Court limit reached', action: { label: 'Upgrade', onPress: () => navigation.navigate('Subscription', { venueId }) } },
        );
      } else {
        Alert.alert('Error', extractApiError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteCourt.mutateAsync(Number(deleteTarget.id));
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setDeleteTarget(null);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  const getSportLabel = (id: string) => {
    const s = sports.find((sp) => sp.id === id);
    return s ? `${s.icon} ${s.name}` : id;
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title="Manage Courts"
        onBack={() => navigation.goBack()}
        rightLabel="+ Add"
        onRightPress={openCreate}
      />

      {/* Venue context bar */}
      {venue && (
        <View style={styles.venueBar}>
          <Text style={styles.venueBarName} numberOfLines={1}>{venue.name}</Text>
          <Text style={styles.venueBarMeta} numberOfLines={1}>📍 {venue.address}</Text>
        </View>
      )}

      {showForm ? (
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.formTitle}>{editing ? 'Edit Court' : 'New Court'}</Text>

          {/* ── Name ────────────────────────────────────────────────── */}
          <AppInput
            label="Court Name *"
            value={name}
            onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
            placeholder="e.g. Football Ground A"
          />
          {errors.name ? <Text style={styles.fieldError}>{errors.name}</Text> : null}

          {/* ── Type (optional) ──────────────────────────────────────── */}
          <AppInput
            label="Type (optional)"
            value={type}
            onChangeText={setType}
            placeholder="e.g. Indoor, Outdoor, Turf"
          />

          {/* ── Sport ───────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Sport *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportRow}>
            {(venueSports.length > 0 ? venueSports : sports).map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setSportId(s.id); setErrors((e) => ({ ...e, sport: '' })); }}
                style={[styles.hourChip, sportId === s.id && styles.hourChipActive]}
              >
                <Text style={[styles.hourChipText, sportId === s.id && { color: colors.white }]}>
                  {s.icon} {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.sport ? <Text style={styles.fieldError}>{errors.sport}</Text> : null}

          {/* ── Operating Hours ──────────────────────────────────────── */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Use venue hours</Text>
              <Text style={styles.toggleSub}>
                {useVenueHours
                  ? `Inherits ${venueOpenTime} – ${venueCloseTime}`
                  : 'Set custom hours below'}
              </Text>
            </View>
            <Switch
              value={useVenueHours}
              onValueChange={(v) => { setUseVenueHours(v); setErrors((e) => ({ ...e, hours: '' })); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {useVenueHours ? (
            <InheritBadge label={`${venueOpenTime} – ${venueCloseTime}`} />
          ) : (
            <>
              <HourPickerDropdown
                label="Court Opening Hour"
                value={openTime}
                onChange={(v) => { setOpenTime(v); setErrors((e) => ({ ...e, hours: '' })); }}
                minHour={parseInt(venueOpenTime.split(':')[0], 10)}
                maxHour={parseInt(closeTime.split(':')[0], 10) - 1}
              />
              <HourPickerDropdown
                label="Court Closing Hour"
                value={closeTime}
                onChange={(v) => { setCloseTime(v); setErrors((e) => ({ ...e, hours: '' })); }}
                minHour={parseInt(openTime.split(':')[0], 10) + 1}
                maxHour={parseInt(venueCloseTime.split(':')[0], 10)}
              />
              {errors.hours ? <Text style={styles.fieldError}>{errors.hours}</Text> : null}
            </>
          )}

          {/* ── Price per Hour ───────────────────────────────────────── */}
          <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Use venue price</Text>
              <Text style={styles.toggleSub}>
                {useVenuePrice
                  ? `Inherits ₹${venuePricePerHour}/hr`
                  : 'Set custom price below'}
              </Text>
            </View>
            <Switch
              value={useVenuePrice}
              onValueChange={(v) => { setUseVenuePrice(v); setErrors((e) => ({ ...e, price: '' })); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {useVenuePrice ? (
            <InheritBadge label={`₹${venuePricePerHour}/hr`} />
          ) : (
            <>
              <AppInput
                label="Price per Hour (₹) *"
                value={price}
                onChangeText={(v) => { setPrice(v); setErrors((e) => ({ ...e, price: '' })); }}
                keyboardType="numeric"
                placeholder="e.g. 900"
              />
              {errors.price ? <Text style={styles.fieldError}>{errors.price}</Text> : null}
            </>
          )}

          {/* ── Active toggle ────────────────────────────────────────── */}
          <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Court is Active</Text>
              <Text style={styles.toggleSub}>Inactive courts are hidden from players</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <View style={styles.formActions}>
            <AppButton label="Cancel" variant="ghost" fullWidth={false} onPress={cancelForm} style={{ flex: 1 }} />
            <AppButton
              label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              loading={saving}
              fullWidth={false}
              onPress={handleSave}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {isLoading ? (
            <LoadingOverlay visible={isLoading} />
          ) : courts.length === 0 ? (
            <EmptyState
              icon="🏸"
              title="No courts yet"
              subtitle="Add your first court to start managing slots"
            />
          ) : (
            courts.map((court) => (
              <View key={court.id} style={[styles.card, shadow.card]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.courtName}>{court.name}</Text>
                      {!court.isActive && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.courtMeta}>
                      {getSportLabel(court.sportId)}
                      {court.type ? ` · ${court.type}` : ''}
                    </Text>
                    <Text style={styles.courtHours}>
                      {court.effectiveOpenTime} – {court.effectiveCloseTime}
                      {court.openTime ? ' (custom)' : ' (venue)'}
                    </Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>₹{court.effectivePricePerHour}/hr</Text>
                    {court.pricePerHour === null && (
                      <Text style={styles.inheritLabel}>venue rate</Text>
                    )}
                    {court.peakPrice > 0 && (
                      <Text style={styles.peakLabel}>Peak ₹{court.peakPrice}</Text>
                    )}
                    {/* Compact icon actions — keeps the card short, no clipping on narrow devices */}
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => openEdit(court)}
                        activeOpacity={0.7}
                        accessibilityLabel="Edit court"
                      >
                        <Feather name="edit-2" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconBtn, styles.iconBtnDanger]}
                        onPress={() => setDeleteTarget(court)}
                        activeOpacity={0.7}
                        accessibilityLabel="Delete court"
                      >
                        <Feather name="trash-2" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <ConfirmActionModal
        visible={!!deleteTarget}
        title="Delete Court?"
        message={`Remove "${deleteTarget?.name}"? All its slots will also be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onDismiss={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  venueBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  venueBarName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  venueBarMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },

  formContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  listContent:  { padding: spacing.lg },

  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMid,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: '#e53935',
    marginBottom: spacing.sm,
  },

  sportRow: { marginBottom: spacing.sm },

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
  hourChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.lg,
  },
  toggleLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  toggleSub:   { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },

  inheritBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  inheritBadgeText: { fontSize: fontSize.xs, color: colors.textMid, fontWeight: fontWeight.semibold },

  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },

  // Court cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  courtName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  courtMeta: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  courtHours: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  priceCol: { alignItems: 'flex-end', marginLeft: spacing.sm },
  priceLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  inheritLabel: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  peakLabel:  { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  iconBtn: {
    width: 34, height: 34, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnDanger: { borderColor: colors.danger },
  inactiveBadge: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: fontSize.xs, color: colors.textDim },
});
