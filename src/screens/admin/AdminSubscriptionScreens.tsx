import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppButton, AppInput, SectionTabBar, EmptyState } from '../../components/common';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { useAdminVenues } from '../../api/hooks/useVenues';
import {
  useAdminPlans, useUpdatePlan, useAdminVenueSubscription, useCreateSubscription,
  useEditSubscription, useVoidSubscription, useRenewSubscription,
  useChangeRequests, useActivateChangeRequest, useRejectChangeRequest,
} from '../../api/hooks/useSubscription';
import type { SubscriptionPlan, SubscriptionStatus, Venue } from '../../types';

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  TRIALING: colors.info, ACTIVE: colors.success, PAST_DUE: colors.warning,
  EXPIRED: colors.danger, CANCELED: colors.textDim, VOIDED: colors.textDim,
};
function fmt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SubscriptionManagementScreen({ navigation, route }: any) {
  const [tab, setTab] = useState<string>(route?.params?.tab ?? 'activate');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Subscriptions" onBack={() => navigation.goBack()} />
      <SectionTabBar
        tabs={[
          { label: 'Activate', value: 'activate' },
          { label: 'Requests', value: 'requests' },
          { label: 'Plans', value: 'plans' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />
      {tab === 'activate' && <ActivateTab />}
      {tab === 'requests' && <RequestsTab />}
      {tab === 'plans' && <PlansTab />}
    </SafeAreaView>
  );
}

/* ── Activate / per-venue detail ─────────────────────────────────────────── */
function ActivateTab() {
  // Admin venue count is bounded (hundreds at most); fetch them all once and
  // filter client-side inside the searchable picker — no cramped horizontal scroll.
  const venuesQ = useAdminVenues({ page: 0, size: 500 });
  const venues: Venue[] = venuesQ.data?.venues ?? [];
  const [venue, setVenue] = useState<Venue | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => { if (!venue && venues.length) setVenue(venues[0]); }, [venues, venue]);

  const subQ = useAdminVenueSubscription(venue?.id);
  const view = subQ.data;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.label}>Venue</Text>
      <TouchableOpacity
        style={styles.venueSelect}
        onPress={() => setPickerOpen(true)}
        disabled={venuesQ.isLoading}
      >
        <Feather name="map-pin" size={16} color={colors.admin} />
        <View style={{ flex: 1 }}>
          <Text style={styles.venueSelectName} numberOfLines={1}>
            {venuesQ.isLoading ? 'Loading venues…' : venue?.name ?? 'Select a venue'}
          </Text>
          {venue ? <Text style={styles.venueSelectSub} numberOfLines={1}>{venue.city}</Text> : null}
        </View>
        <Feather name="chevron-down" size={20} color={colors.textDim} />
      </TouchableOpacity>
      <Text style={styles.venueCount}>
        {venues.length} venue{venues.length === 1 ? '' : 's'} · tap to search
      </Text>

      <VenuePickerModal
        visible={pickerOpen}
        venues={venues}
        selectedId={venue?.id}
        onSelect={(v) => { setVenue(v); setPickerOpen(false); }}
        onClose={() => setPickerOpen(false)}
      />

      {!venue ? (
        <EmptyState title="No venues" subtitle="No venues to manage yet." />
      ) : subQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : view?.current ? (
        <VenueSubscriptionDetail venue={venue} />
      ) : (
        <CreateSubscriptionForm venue={venue} />
      )}
    </ScrollView>
  );
}

/** Full-screen searchable venue picker — scales to hundreds of venues. */
function VenuePickerModal({ visible, venues, selectedId, onSelect, onClose }: {
  visible: boolean;
  venues: Venue[];
  selectedId?: string;
  onSelect: (v: Venue) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return venues;
    return venues.filter(
      (v) => v.name.toLowerCase().includes(term) || (v.city ?? '').toLowerCase().includes(term),
    );
  }, [q, venues]);

  // Reset the search box each time the picker opens.
  useEffect(() => { if (visible) setQ(''); }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select venue</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Feather name="search" size={18} color={colors.textDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or city"
              placeholderTextColor={colors.textDim}
              value={q}
              onChangeText={setQ}
              autoFocus
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ('')}>
                <Feather name="x-circle" size={18} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(v) => v.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.pickerEmpty}>No venues match “{q}”.</Text>}
            renderItem={({ item }) => {
              const active = item.id === selectedId;
              return (
                <TouchableOpacity style={styles.pickerRow} onPress={() => onSelect(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerRowName, active && { color: colors.admin }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerRowSub} numberOfLines={1}>{item.city}</Text>
                  </View>
                  {active && <Feather name="check" size={20} color={colors.admin} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

function PlanCyclePicker({ plans, onSubmit, busy, submitPrefix }: {
  plans: SubscriptionPlan[]; busy: boolean; submitPrefix: string;
  onSubmit: (planId: number, cycle: 'MONTHLY' | 'ANNUAL', asTrial: boolean) => void;
}) {
  const [planId, setPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [asTrial, setAsTrial] = useState(false);

  useEffect(() => { if (!planId && plans.length) setPlanId(plans[0].id); }, [plans, planId]);
  const selected = plans.find((p) => p.id === planId);

  return (
    <View>
      <Text style={styles.label}>Plan</Text>
      <View style={styles.chipWrap}>
        {plans.map((p) => {
          const active = p.id === planId;
          return (
            <TouchableOpacity key={p.id} onPress={() => setPlanId(p.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && { color: colors.white }]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected && (
        <Text style={styles.hint}>
          ₹{selected.priceMonthly}/mo · ₹{selected.priceAnnual}/yr · up to {selected.maxCourts} courts
        </Text>
      )}

      <Text style={[styles.label, { marginTop: spacing.md }]}>Billing cycle</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(['MONTHLY', 'ANNUAL'] as const).map((c) => (
          <TouchableOpacity key={c} onPress={() => setCycle(c)}
            style={[styles.chip, cycle === c && styles.chipActive]}>
            <Text style={[styles.chipText, cycle === c && { color: colors.white }]}>
              {c === 'MONTHLY' ? 'Monthly' : 'Annual'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Activate as trial</Text>
        <Switch value={asTrial} onValueChange={setAsTrial} />
      </View>

      <Text style={styles.noteText}>
        The server computes the period dates — no dates are entered here.
      </Text>
      <AppButton
        label={busy ? 'Working…' : submitPrefix}
        onPress={() => planId && onSubmit(Number(planId), cycle, asTrial)}
        disabled={busy || !planId}
        variant="primary"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
}

function CreateSubscriptionForm({ venue }: { venue: Venue }) {
  const plansQ = useAdminPlans();
  const createMut = useCreateSubscription();
  const plans = (plansQ.data ?? []).filter((p) => p.active);

  const submit = (planId: number, cycle: 'MONTHLY' | 'ANNUAL', asTrial: boolean) => {
    createMut.mutate(
      {
        ownerId: Number(venue.ownerId), venueId: Number(venue.id), planId,
        billingCycle: cycle, asTrial, paymentMethod: 'CASH',
      },
      {
        onSuccess: (s) => toast.success(`Activated ${s.planName} — live until ${fmt(s.periodEnd)}.`),
        onError: (e) => toast.error(extractApiError(e) || 'Could not activate'),
      },
    );
  };

  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={styles.cardTitle}>Activate a subscription</Text>
      <Text style={styles.hint}>{venue.name} has no active subscription.</Text>
      {plansQ.isLoading ? <ActivityIndicator color={colors.admin} />
        : <PlanCyclePicker plans={plans} busy={createMut.isPending} submitPrefix="Activate (venue goes live)" onSubmit={submit} />}
    </View>
  );
}

function VenueSubscriptionDetail({ venue }: { venue: Venue }) {
  const subQ = useAdminVenueSubscription(venue.id);
  const plansQ = useAdminPlans();
  const editMut = useEditSubscription();
  const voidMut = useVoidSubscription();
  const renewMut = useRenewSubscription();
  const [editing, setEditing] = useState(false);
  const view = subQ.data;
  const current = view?.current;
  if (!current) return null;
  const color = STATUS_COLOR[current.status];
  const plans = (plansQ.data ?? []).filter((p) => p.active);

  const doEdit = (planId: number, cycle: 'MONTHLY' | 'ANNUAL') => {
    editMut.mutate({ id: Number(current.id), data: { planId, billingCycle: cycle } }, {
      onSuccess: () => { toast.success('Plan updated; dates recomputed.'); setEditing(false); },
      onError: (e) => toast.error(extractApiError(e) || 'Could not edit'),
    });
  };

  return (
    <View>
      <View style={[styles.card, shadow.card]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{current.planName}</Text>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{current.status}</Text>
          </View>
        </View>
        <Text style={styles.hint}>₹{current.price} / {current.billingCycle === 'ANNUAL' ? 'year' : 'month'}</Text>
        <View style={styles.divider} />
        <Row label="Period" value={`${fmt(current.periodStart)} → ${fmt(current.periodEnd)}`} />
        <Row label="Courts" value={`${view?.courtsUsed ?? 0} / ${view?.courtsAllowed ?? current.maxCourts}`} />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <AppButton label="Renew" variant="primary" style={{ flex: 1 }} disabled={renewMut.isPending}
            onPress={() => renewMut.mutate(Number(current.id), {
              onSuccess: () => toast.success('Renewed.'),
              onError: (e) => toast.error(extractApiError(e) || 'Could not renew'),
            })} />
          <AppButton label="Change plan" variant="secondary" style={{ flex: 1 }}
            onPress={() => setEditing((s) => !s)} />
          <AppButton label="Void" variant="danger" style={{ flex: 1 }} disabled={voidMut.isPending}
            onPress={() => voidMut.mutate(Number(current.id), {
              onSuccess: () => toast.success('Voided; venue suspended.'),
              onError: (e) => toast.error(extractApiError(e) || 'Could not void'),
            })} />
        </View>
      </View>

      {editing && (
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.cardTitle}>Change plan / cycle</Text>
          <PlanCyclePicker plans={plans} busy={editMut.isPending} submitPrefix="Apply change"
            onSubmit={(planId, cycle) => doEdit(planId, cycle)} />
        </View>
      )}

      {view && view.history.length > 0 && (
        <>
          <Text style={styles.section}>History</Text>
          {view.history.map((h) => (
            <View key={h.id} style={styles.histRow}>
              <View style={styles.rowBetween}>
                <Text style={styles.histPlan}>{h.planName}</Text>
                <Text style={{ color: STATUS_COLOR[h.status], fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
                  {h.status}
                </Text>
              </View>
              <Text style={styles.histMeta}>{fmt(h.periodStart)} → {fmt(h.periodEnd)} · ₹{h.price}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/* ── Upgrade-request queue ───────────────────────────────────────────────── */
function RequestsTab() {
  const reqQ = useChangeRequests('PENDING');
  const activateMut = useActivateChangeRequest();
  const rejectMut = useRejectChangeRequest();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const requests = reqQ.data ?? [];

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {reqQ.isLoading ? <ActivityIndicator color={colors.admin} />
        : requests.length === 0 ? <EmptyState title="No pending requests" subtitle="Owner upgrade requests appear here." />
        : requests.map((r) => (
          <View key={r.id} style={[styles.card, shadow.card]}>
            {/* Venue + owner — who is asking */}
            <Text style={styles.cardTitle} numberOfLines={1}>{r.venueName}</Text>
            <Text style={styles.hint} numberOfLines={1}>
              {r.ownerName}{r.venueCity ? ` · ${r.venueCity}` : ''}
            </Text>

            {/* Plan change — what they want */}
            <View style={styles.reqPlanRow}>
              <View style={styles.reqPlanBox}>
                <Text style={styles.reqPlanLabel}>Current</Text>
                <Text style={styles.reqPlanValue} numberOfLines={1}>{r.currentPlanName ?? 'None'}</Text>
              </View>
              <Feather name="arrow-right" size={18} color={colors.textDim} />
              <View style={styles.reqPlanBox}>
                <Text style={styles.reqPlanLabel}>Requested</Text>
                <Text style={[styles.reqPlanValue, { color: colors.admin }]} numberOfLines={1}>{r.requestedPlanName}</Text>
              </View>
            </View>

            {/* Pricing + meta */}
            <View style={styles.divider} />
            <Row label="Billing" value={r.requestedCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} />
            <Row label="Price" value={`₹${r.requestedPlanPrice.toLocaleString('en-IN')} / ${r.requestedCycle === 'ANNUAL' ? 'yr' : 'mo'}`} />
            <Row label="Court limit" value={`up to ${r.requestedPlanMaxCourts} courts`} />
            <Row label="Requested on" value={fmt(r.createdAt)} />

            {rejectingId === r.id ? (
              <View style={{ marginTop: spacing.sm }}>
                <AppInput placeholder="Reason for rejection" value={reason} onChangeText={setReason} />
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <AppButton label="Confirm reject" variant="danger" style={{ flex: 1 }} disabled={rejectMut.isPending}
                    onPress={() => rejectMut.mutate({ id: Number(r.id), reason: reason || 'Not approved' }, {
                      onSuccess: () => { toast.success('Request rejected.'); setRejectingId(null); setReason(''); },
                      onError: (e) => toast.error(extractApiError(e) || 'Failed'),
                    })} />
                  <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setRejectingId(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <AppButton label="Activate" variant="primary" style={{ flex: 1 }} disabled={activateMut.isPending}
                  onPress={() => activateMut.mutate(Number(r.id), {
                    onSuccess: () => toast.success('Upgrade activated.'),
                    onError: (e) => toast.error(extractApiError(e) || 'Failed'),
                  })} />
                <AppButton label="Reject" variant="secondary" style={{ flex: 1 }}
                  onPress={() => { setRejectingId(r.id); setReason(''); }} />
              </View>
            )}
          </View>
        ))}
    </ScrollView>
  );
}

/* ── Plan catalog editor ─────────────────────────────────────────────────── */
function PlansTab() {
  const plansQ = useAdminPlans();
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      {plansQ.isLoading ? <ActivityIndicator color={colors.admin} />
        : (plansQ.data ?? []).map((p) => <PlanEditorCard key={p.id} plan={p} />)}
    </ScrollView>
  );
}

function PlanEditorCard({ plan }: { plan: SubscriptionPlan }) {
  const updateMut = useUpdatePlan();
  const [open, setOpen] = useState(false);
  const [monthly, setMonthly] = useState(String(plan.priceMonthly));
  const [annual, setAnnual] = useState(String(plan.priceAnnual));
  const [maxCourts, setMaxCourts] = useState(String(plan.maxCourts));
  const [photoLimit, setPhotoLimit] = useState(String(plan.photoLimit));
  const [active, setActive] = useState(plan.active);

  const save = () => {
    updateMut.mutate(
      {
        id: Number(plan.id),
        data: {
          priceMonthly: Number(monthly), priceAnnual: Number(annual),
          maxCourts: Number(maxCourts), photoLimit: Number(photoLimit), active,
        },
      },
      {
        onSuccess: () => { toast.success(`${plan.name} updated.`); setOpen(false); },
        onError: (e) => toast.error(extractApiError(e) || 'Could not save'),
      },
    );
  };

  return (
    <View style={[styles.card, shadow.card]}>
      <TouchableOpacity style={styles.rowBetween} onPress={() => setOpen((s) => !s)}>
        <Text style={styles.cardTitle}>{plan.name}{!plan.active ? ' (inactive)' : ''}</Text>
        <Text style={styles.hint}>₹{plan.priceMonthly}/mo · {plan.maxCourts} courts</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ marginTop: spacing.sm }}>
          <AppInput label="Price / month (₹)" value={monthly} onChangeText={setMonthly} keyboardType="numeric" />
          <AppInput label="Price / year (₹)" value={annual} onChangeText={setAnnual} keyboardType="numeric" />
          <AppInput label="Max courts" value={maxCourts} onChangeText={setMaxCourts} keyboardType="numeric" />
          <AppInput label="Photo limit" value={photoLimit} onChangeText={setPhotoLimit} keyboardType="numeric" />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Active</Text>
            <Switch value={active} onValueChange={setActive} />
          </View>
          <AppButton label="Save" onPress={save} disabled={updateMut.isPending} style={{ marginTop: spacing.sm }} />
        </View>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.rLabel}>{label}</Text>
      <Text style={styles.rValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.sm, color: colors.textDim, marginTop: 2 },
  noteText: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.sm, fontStyle: 'italic' },
  venueSelect: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  venueSelectName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  venueSelectSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  venueCount: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs, marginBottom: spacing.md },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.lg, maxHeight: '85%', minHeight: '55%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  pickerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, height: 46, marginHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  pickerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerRowName: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  pickerRowSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  pickerEmpty: { textAlign: 'center', color: colors.textDim, fontSize: fontSize.sm, padding: spacing.xl },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, maxWidth: 200 },
  chipActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rLabel: { fontSize: fontSize.sm, color: colors.textMid, paddingVertical: 4 },
  rValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  reqPlanRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  reqPlanBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reqPlanLabel: { fontSize: fontSize.xs, color: colors.textDim },
  reqPlanValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 2 },
  histRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  histPlan: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  histMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
});
