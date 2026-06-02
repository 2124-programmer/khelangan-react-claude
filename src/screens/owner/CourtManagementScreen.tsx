import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput, EmptyState } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useCourts, useCreateCourt, useUpdateCourt, useDeleteCourt } from '../../api/hooks/useCourts';
import { useSports } from '../../api/hooks/useSports';
import { extractApiError } from '../../api/client';
import type { Court } from '../../types';

export default function CourtManagementScreen({ navigation, route }: any) {
  const venueId: number = Number(route.params.venueId);

  const { data: courts = [], isLoading } = useCourts(venueId);
  const { data: sports = [] } = useSports();
  const createCourt = useCreateCourt(venueId);
  const updateCourt = useUpdateCourt(venueId);
  const deleteCourt = useDeleteCourt(venueId);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState('');
  const [peakPrice, setPeakPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Court | null>(null);

  function openCreate() {
    setEditing(null);
    setName('');
    setSportId(sports[0]?.id ?? '');
    setType('');
    setPrice('');
    setPeakPrice('');
    setShowForm(true);
  }

  function openEdit(court: Court) {
    setEditing(court);
    setName(court.name);
    setSportId(court.sportId);
    setType(court.type);
    setPrice(String(court.pricePerSlot));
    setPeakPrice(String(court.peakPrice));
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleSave() {
    if (!name.trim() || !sportId || !type.trim() || !price) {
      Alert.alert('Validation', 'Name, sport, type, and price are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sportId: Number(sportId),
        type: type.trim(),
        pricePerSlot: Number(price),
        peakPrice: peakPrice ? Number(peakPrice) : 0,
      };
      if (editing) {
        await updateCourt.mutateAsync({ courtId: Number(editing.id), data: payload });
      } else {
        await createCourt.mutateAsync(payload);
      }
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

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

  const getSportLabel = (id: string) => {
    const s = sports.find((sp) => sp.id === id);
    return s ? `${s.icon} ${s.name}` : id;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Manage Courts"
        onBack={() => navigation.goBack()}
        rightLabel="+ Add"
        onRightPress={openCreate}
      />

      {showForm ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <Text style={styles.formTitle}>{editing ? 'Edit Court' : 'New Court'}</Text>

          <AppInput label="Court Name" value={name} onChangeText={setName} placeholder="e.g. Court A" />
          <AppInput label="Type" value={type} onChangeText={setType} placeholder="e.g. Indoor, Outdoor" />
          <AppInput
            label="Price per Slot (₹)"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <AppInput
            label="Peak Price (₹, optional)"
            value={peakPrice}
            onChangeText={setPeakPrice}
            keyboardType="numeric"
          />

          <Text style={styles.fieldLabel}>Sport</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportRow}>
            {sports.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSportId(s.id)}
                style={[styles.sportChip, sportId === s.id && styles.sportChipActive]}
              >
                <Text style={[styles.sportChipText, sportId === s.id && { color: colors.white }]}>
                  {s.icon} {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.formActions}>
            <AppButton
              label="Cancel"
              variant="ghost"
              fullWidth={false}
              onPress={cancelForm}
              style={{ flex: 1 }}
            />
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
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
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
                    <Text style={styles.courtName}>{court.name}</Text>
                    <Text style={styles.courtMeta}>
                      {getSportLabel(court.sportId)} · {court.type}
                    </Text>
                  </View>
                  <View style={styles.priceCol}>
                    <Text style={styles.priceLabel}>₹{court.pricePerSlot}</Text>
                    {court.peakPrice > 0 && (
                      <Text style={styles.peakLabel}>Peak ₹{court.peakPrice}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <AppButton
                    label="Edit"
                    variant="secondary"
                    fullWidth={false}
                    onPress={() => openEdit(court)}
                    style={{ flex: 1, height: 38 }}
                  />
                  <AppButton
                    label="Delete"
                    variant="danger"
                    fullWidth={false}
                    onPress={() => setDeleteTarget(court)}
                    style={{ flex: 1, height: 38 }}
                  />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  formTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginTop: spacing.lg, marginBottom: spacing.sm },
  sportRow: { marginBottom: spacing.md },
  sportChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginRight: spacing.sm },
  sportChipActive: { backgroundColor: colors.primary },
  sportChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  courtName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  courtMeta: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  priceLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  peakLabel: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
