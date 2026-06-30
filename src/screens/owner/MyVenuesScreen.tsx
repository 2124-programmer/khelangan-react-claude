import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { PlanBadge } from '../../components/PlanBadge';
import { resolvePlanCode } from '../../theme/planMeta';
import { AppHeader, AppButton, StatusBadge, EmptyState, LoadingOverlay } from '../../components/common';
import { VenueSubscriptionStrip } from '../../components/subscription/OwnerSubscriptionPurchase';
import { useOwnerVenues, useSubmitVenue } from '../../api/hooks/useVenues';
import { useOwnerPlans } from '../../api/hooks/useSubscription';
import { toast } from '../../toast';
import { extractApiError } from '../../api/client';
import type { Venue } from '../../types';
import { ResponsiveGrid, centeredContent } from '../../responsive';

const FREE_COURT_THRESHOLD = 2;

/** Whole days since the venue was first created/registered on the platform. */
function platformDays(submittedAt?: string): number | null {
  if (!submittedAt) return null;
  const t = new Date(submittedAt).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** Human-friendly tenure line; reads "Joined today" instead of "for 0 days". */
function platformLabel(submittedAt?: string): string | null {
  const days = platformDays(submittedAt);
  if (days === null) return null;
  if (days === 0) return 'Joined Score-Adda today';
  return `On Score-Adda for ${days} day${days === 1 ? '' : 's'}`;
}

export default function MyVenuesScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useOwnerVenues();
  const submit = useSubmitVenue();
  const plansQ = useOwnerPlans();
  const venues = data?.venues ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const [tierVenue, setTierVenue] = useState<Venue | null>(null);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const doSubmit = async (venue: Venue, planId?: number) => {
    try {
      await submit.mutateAsync({ venueId: Number(venue.id), planId });
      toast.success('Submitted for approval.');
      setTierVenue(null);
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  // ≤2 courts submit free; above the threshold the owner picks a qualifying tier first.
  const onSubmitPress = (venue: Venue) => {
    if (venue.courtCount > FREE_COURT_THRESHOLD) setTierVenue(venue);
    else doSubmit(venue);
  };

  const plans = plansQ.data ?? [];

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="My Venues" />
      <View style={styles.addBar}>
        <TouchableOpacity onPress={() => navigation.navigate('AddVenue')} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {venues.length === 0 && !isLoading ? (
          <EmptyState icon="🏟" title="No venues yet" subtitle="Add your first venue to start accepting bookings" />
        ) : (
          <ResponsiveGrid>
          {venues.map((v) => {
            const submittable = v.status === 'draft' || v.status === 'changes_requested';
            return (
              <View key={v.id} style={[styles.card, shadow.card]}>
                <Image source={{ uri: v.coverPhoto || undefined }} style={styles.img} />
                <View style={styles.body}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={styles.name}>{v.name}</Text>
                    <StatusBadge status={v.status} />
                  </View>
                  <Text style={styles.addr}>📍 {v.address}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>
                      {v.ratingAverage !== null ? `★ ${v.ratingAverage.toFixed(1)} (${v.ratingCount})` : 'New'}
                    </Text>
                    <Text style={styles.meta}>{v.courtCount} courts</Text>
                  </View>
                  {platformLabel(v.submittedAt) && (
                    <Text style={styles.platformMeta}>
                      🗓  {platformLabel(v.submittedAt)}
                    </Text>
                  )}

                  {/* Status-aware subscription strip — only meaningful once the venue is approved/live. */}
                  {v.status === 'live' && (
                    <View style={{ marginTop: spacing.sm }}>
                      <VenueSubscriptionStrip
                        venueId={v.id}
                        onManage={() => navigation.navigate('VenueDetail', { venueId: v.id, mode: 'preview' })}
                      />
                    </View>
                  )}

                  {v.status === 'draft' && (
                    <View style={styles.draftNotice}>
                      <Text style={styles.draftNoticeText}>
                        📝 Draft — add your courts, then submit for approval.
                      </Text>
                    </View>
                  )}

                  {v.status === 'changes_requested' && (
                    <View style={styles.changesNotice}>
                      <Text style={styles.changesTitle}>Admin requested changes</Text>
                      <Text style={styles.changesText}>
                        Review the feedback, edit the details, then resubmit.
                      </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('VenueDetail', { venueId: v.id, mode: 'preview' })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.changesLink}>View admin feedback ›</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {submittable && (
                    <AppButton
                      label={submit.isPending ? 'Submitting…'
                        : v.status === 'changes_requested' ? 'Resubmit for approval' : 'Submit for approval'}
                      loading={submit.isPending}
                      onPress={() => onSubmitPress(v)}
                      style={{ marginTop: spacing.md, height: 42 }}
                    />
                  )}

                  <View style={styles.actions}>
                    <AppButton
                      label="Courts"
                      variant="secondary"
                      fullWidth={false}
                      onPress={() => navigation.navigate('CourtManagement', { venueId: v.id })}
                      style={{ flex: 1, height: 40 }}
                    />
                    {/* Icon-only buttons keep the row compact so labels never clip on narrow devices */}
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate('VenueCalendar', { venueId: v.id })}
                      activeOpacity={0.7}
                      accessibilityLabel="Calendar"
                    >
                      <Feather name="calendar" size={18} color={colors.textMid} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate('EditVenue', { venueId: v.id })}
                      activeOpacity={0.7}
                      accessibilityLabel="Edit venue"
                    >
                      <Feather name="edit-2" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => navigation.navigate('VenueDetail', { venueId: v.id, mode: 'preview' })}
                      activeOpacity={0.7}
                      accessibilityLabel="Preview venue"
                    >
                      <Feather name="eye" size={18} color={colors.textMid} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          </ResponsiveGrid>
        )}
      </ScrollView>

      {/* Tier selection for venues over the free court threshold */}
      <Modal transparent visible={!!tierVenue} animationType="fade" onRequestClose={() => setTierVenue(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, shadow.modal]}>
            <Text style={styles.modalTitle}>Choose a plan</Text>
            <Text style={styles.modalMsg}>
              {tierVenue?.name} has {tierVenue?.courtCount} courts. Select a plan that supports them to submit.
              After approval, start a free trial (or this plan) and pick which courts to make bookable.
            </Text>
            <ScrollView style={{ maxHeight: 320, marginTop: spacing.md }}>
              {plans.map((p) => {
                const fits = p.maxCourts >= (tierVenue?.courtCount ?? 0);
                return (
                  <TouchableOpacity
                    key={p.id}
                    disabled={!fits || submit.isPending}
                    onPress={() => tierVenue && doSubmit(tierVenue, Number(p.id))}
                    activeOpacity={0.8}
                    style={[styles.planRow, !fits && styles.planRowDisabled]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      {resolvePlanCode(p.code) ? (
                        <PlanBadge plan={resolvePlanCode(p.code)!} />
                      ) : (
                        <Text style={styles.planName}>{p.name}</Text>
                      )}
                      <Text style={styles.planMeta}>Up to {p.maxCourts} courts · ₹{p.priceMonthly}/mo</Text>
                    </View>
                    {fits
                      ? <Text style={styles.planPick}>Select ›</Text>
                      : <Text style={styles.planTooSmall}>Too small</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <AppButton label="Cancel" variant="secondary" onPress={() => setTierVenue(null)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>

      <LoadingOverlay visible={isLoading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  addBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary },
  addBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  img: { width: '100%', height: 130, backgroundColor: colors.surfaceAlt },
  body: { padding: spacing.lg },
  name: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  addr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  meta: { fontSize: fontSize.xs, color: colors.textMid },
  platformMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 4 },
  draftNotice: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  draftNoticeText: { fontSize: fontSize.xs, color: colors.textMid, lineHeight: 17 },
  changesNotice: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: '#FDE68A' },
  changesTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: '#B45309' },
  changesText: { fontSize: fontSize.xs, color: '#B45309', lineHeight: 17, marginTop: 2 },
  changesLink: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  modalMsg: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm, lineHeight: 20 },
  planRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  planRowDisabled: { opacity: 0.5 },
  planName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  planMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  planPick: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.bold },
  planTooSmall: { fontSize: fontSize.xs, color: colors.textDim },
});
