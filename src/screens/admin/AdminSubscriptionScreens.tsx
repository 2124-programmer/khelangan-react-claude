import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
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

export function SubscriptionManagementScreen({ navigation }: any) {
  const [tab, setTab] = useState('activate');
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
  const venuesQ = useAdminVenues({ page: 0 });
  const venues: Venue[] = venuesQ.data?.venues ?? [];
  const [venue, setVenue] = useState<Venue | null>(null);

  useEffect(() => { if (!venue && venues.length) setVenue(venues[0]); }, [venues, venue]);

  const subQ = useAdminVenueSubscription(venue?.id);
  const view = subQ.data;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.label}>Venue</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {venues.map((v) => {
          const active = v.id === venue?.id;
          return (
            <TouchableOpacity key={v.id} onPress={() => setVenue(v)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && { color: colors.white }]} numberOfLines={1}>{v.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
            <Text style={styles.cardTitle}>{r.requestedPlanName}</Text>
            <Text style={styles.hint}>
              Cycle: {r.requestedCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} · Venue #{r.venueId} · {fmt(r.createdAt)}
            </Text>
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
  histRow: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  histPlan: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  histMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
});
