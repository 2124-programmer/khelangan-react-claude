import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, ActivityIndicator,
  FlatList, TextInput, Linking, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppButton, AppInput, SectionTabBar, EmptyState } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { SubscriptionTimeline, RecentSubscriptionsStrip } from '../../components/subscription/SubscriptionTimeline';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { useDebounce } from '../../hooks/useDebounce';
import {
  useAdminPlans, useUpdatePlan, useAdminVenueSubscription, useCreateSubscription,
  useEditSubscription, useVoidSubscription, useRenewSubscription,
  useChangeRequests, useActivateChangeRequest, useRejectChangeRequest, useChangeRequestCourts,
  useAdminVenueSubscriptions,
} from '../../api/hooks/useSubscription';
import type {
  SubscriptionPlan, SubscriptionStatus, VenueSubscriptionRow, VenueSubscriptionRowStatus,
  SubscriptionChangeRequest, SelectableCourt,
} from '../../types';

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  TRIALING: colors.info, ACTIVE: colors.success, PAST_DUE: colors.warning,
  EXPIRED: colors.danger, CANCELED: colors.textDim, VOIDED: colors.textDim,
};

/** Row-level rollup pill colours for the table. */
const ROW_STATUS_COLOR: Record<VenueSubscriptionRowStatus, string> = {
  ACTIVE: colors.success, TRIAL: colors.info, EXPIRING: colors.warning,
  EXPIRED: colors.danger, NONE: colors.textDim,
};
const ROW_STATUS_LABEL: Record<VenueSubscriptionRowStatus, string> = {
  ACTIVE: 'Active', TRIAL: 'Trial', EXPIRING: 'Expiring', EXPIRED: 'Expired', NONE: 'No plan',
};

const TABLE_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Trial', value: 'TRIAL' },
  { label: 'Expiring', value: 'EXPIRING' },
  { label: 'Expired', value: 'EXPIRED' },
];

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function callMobile(mobile?: string | null) {
  if (mobile) Linking.openURL(`tel:${mobile}`).catch(() => toast.error('Could not start the call.'));
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
      {tab === 'activate' && <ActivateTab navigation={navigation} />}
      {tab === 'requests' && <RequestsTab navigation={navigation} />}
      {tab === 'plans' && <PlansTab />}
    </SafeAreaView>
  );
}

/* ── Search + status-filter header shared by the two list tabs ─────────────── */
function ListControls({ query, onQuery, filters, active, onFilter, placeholder }: {
  query: string;
  onQuery: (v: string) => void;
  filters: { label: string; value: string }[];
  active: string;
  onFilter: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.controls}>
      <View style={styles.searchRow}>
        <Feather name="search" size={18} color={colors.textDim} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          value={query}
          onChangeText={onQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => onQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <Feather name="x-circle" size={18} color={colors.textDim} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
        {filters.map((f) => {
          const on = f.value === active;
          return (
            <TouchableOpacity key={f.value} onPress={() => onFilter(f.value)}
              accessibilityRole="button" accessibilityLabel={f.label}
              style={[styles.filterChip, on && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, on && { color: colors.white }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ── Activate tab → searchable, paginated venue-subscription table ─────────── */
function ActivateTab({ navigation }: { navigation: any }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const debounced = useDebounce(search, 300);
  const q = useAdminVenueSubscriptions({ q: debounced, status: filter });
  const rows: VenueSubscriptionRow[] = (q.data?.pages ?? []).flatMap((p) => p.rows);

  return (
    <View style={{ flex: 1 }}>
      <ListControls
        query={search} onQuery={setSearch}
        filters={TABLE_FILTERS} active={filter} onFilter={setFilter}
        placeholder="Search venue, owner, or mobile"
      />
      {q.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.venueId}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="🔍" title="No venues found" subtitle="No venues match your search." />}
          renderItem={({ item }) => <VenueRowCard row={item}
            onView={() => navigation.navigate('SubscriptionDetail', { venueId: item.venueId })} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage(); }}
          ListFooterComponent={q.isFetchingNextPage
            ? <ActivityIndicator color={colors.admin} style={{ marginVertical: spacing.md }} /> : null}
        />
      )}
    </View>
  );
}

function VenueRowCard({ row, onView }: { row: VenueSubscriptionRow; onView: () => void }) {
  const pillColor = ROW_STATUS_COLOR[row.currentStatus];
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle} numberOfLines={1}>{row.venueName}</Text>
        <View style={[styles.badge, { backgroundColor: pillColor }]}>
          <Text style={styles.badgeText}>{ROW_STATUS_LABEL[row.currentStatus]}</Text>
        </View>
      </View>

      <Field label="Owner" value={row.ownerName} />
      {row.ownerMobile ? (
        <View style={styles.fieldRow}>
          <Text style={styles.rLabel}>Mobile</Text>
          <TouchableOpacity onPress={() => callMobile(row.ownerMobile)} accessibilityRole="button"
            accessibilityLabel={`Call ${row.ownerName}`}>
            <Text style={[styles.rValue, styles.link]}>{row.ownerMobile}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <Field label="Current plan" value={row.currentPlanName ?? '—'} />
      <Field label="End date" value={fmt(row.endDate)} />
      <Field label="Courts" value={`${row.courtsUsed}${row.courtLimit != null ? ` / ${row.courtLimit}` : ''}`} />

      {row.pendingRequestId ? (
        <View style={styles.pendingStrip}>
          <Feather name="clock" size={13} color={colors.warning} />
          <Text style={styles.pendingStripText} numberOfLines={1}>
            {(row.pendingCurrentPlanName ?? row.currentPlanName ?? 'None')} → {row.pendingRequestedPlanName}
          </Text>
          <View style={styles.pendingTag}><Text style={styles.pendingTagText}>Requested</Text></View>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <AppButton label="View" variant="secondary" style={{ paddingHorizontal: spacing.xl }} onPress={onView} />
      </View>
    </View>
  );
}

/* ── Subscription detail page (per venue) ─────────────────────────────────── */
export function SubscriptionDetailScreen({ navigation, route }: any) {
  const venueId: string = String(route?.params?.venueId ?? '');
  const subQ = useAdminVenueSubscription(venueId);
  const plansQ = useAdminPlans();
  const editMut = useEditSubscription();
  const voidMut = useVoidSubscription();
  const renewMut = useRenewSubscription();

  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<'renew' | 'suspend' | null>(null);

  const view = subQ.data;
  const current = view?.current ?? null;
  const venue = view?.venue ?? null;
  const owner = view?.owner ?? null;
  const pending = view?.pendingChangeRequest ?? null;
  const courtCount = venue?.courtCount ?? view?.courtsUsed ?? 0;
  const plans = (plansQ.data ?? []).filter((p) => p.active);

  const doEdit = (planId: number, cycle: 'MONTHLY' | 'ANNUAL') => {
    if (!current) return;
    editMut.mutate({ id: Number(current.id), data: { planId, billingCycle: cycle } }, {
      onSuccess: () => { toast.success('Plan changed; dates recomputed.'); setEditing(false); },
      onError: (e) => toast.error(extractApiError(e) || 'Could not change plan'),
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={venue?.name ?? 'Subscription'} onBack={() => navigation.goBack()} />
      {subQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : !view ? (
        <EmptyState icon="⚠️" title="Could not load" subtitle="Try again in a moment." />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          {/* Venue & owner */}
          <View style={[styles.card, shadow.card]}>
            <Text style={styles.cardTitle}>{venue?.name}</Text>
            <Text style={styles.hint}>
              {venue?.city ?? '—'} · {courtCount} court{courtCount === 1 ? '' : 's'}
            </Text>
            <View style={styles.divider} />
            <Field label="Owner" value={owner?.name ?? '—'} />
            {owner?.mobile ? (
              <View style={styles.fieldRow}>
                <Text style={styles.rLabel}>Mobile</Text>
                <TouchableOpacity onPress={() => callMobile(owner.mobile)}>
                  <Text style={[styles.rValue, styles.link]}>{owner.mobile}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {owner?.email ? <Field label="Email" value={owner.email} /> : null}
          </View>

          {/* Current subscription + actions */}
          {current ? (
            <View style={[styles.card, shadow.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{current.planName}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLOR[current.status] }]}>
                  <Text style={styles.badgeText}>{current.status}</Text>
                </View>
              </View>
              <Text style={styles.hint}>₹{current.price.toLocaleString('en-IN')} / {current.billingCycle === 'ANNUAL' ? 'year' : 'month'}</Text>
              <View style={styles.divider} />
              <Field label="Period" value={`${fmt(current.periodStart)} → ${fmt(current.periodEnd)}`} />
              <Field
                label={`Courts covered (${current.coveredCourtNames.length}/${current.maxCourts})`}
                value={current.coveredCourtNames.length ? current.coveredCourtNames.join(', ') : '—'}
              />
              <Field label="Total courts at venue" value={`${courtCount}`} />

              <View style={styles.actionRow}>
                <AppButton label="Renew" variant="primary" style={{ flex: 1 }} disabled={renewMut.isPending}
                  onPress={() => setConfirm('renew')} />
                <AppButton label="Change plan" variant="secondary" style={{ flex: 1 }}
                  onPress={() => setEditing((s) => !s)} />
                <AppButton label="Suspend" variant="danger" style={{ flex: 1 }} disabled={voidMut.isPending}
                  onPress={() => setConfirm('suspend')} />
              </View>
            </View>
          ) : (
            <CreateSubscriptionForm venueId={venueId} ownerId={owner?.id ?? ''} venueName={venue?.name ?? ''} minCourts={0} />
          )}

          {/* Change-plan picker */}
          {editing && current && (
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.cardTitle}>Change plan / cycle</Text>
              <Text style={styles.hint}>Court coverage adjusts to the new plan's limit (a downgrade trims covered courts).</Text>
              <PlanCyclePicker plans={plans} busy={editMut.isPending} submitPrefix="Apply change"
                minCourts={0} hideTrial
                onSubmit={(planId, cycle) => doEdit(planId, cycle)} />
            </View>
          )}

          {/* Pending request — review, edit covered courts, approve (cash received) / reject */}
          {pending && <PendingRequestCard pending={pending} currentPlanName={current?.planName ?? null} />}

          {/* Lifecycle timeline */}
          {view.timeline && (
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.cardTitle}>Lifecycle</Text>
              <View style={{ marginTop: spacing.md }}>
                <SubscriptionTimeline timeline={view.timeline} />
              </View>
              {view.history.length > 0 && (
                <>
                  <Text style={[styles.section, { marginTop: spacing.lg }]}>Recent subscriptions</Text>
                  <RecentSubscriptionsStrip items={view.history} />
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <ConfirmActionModal
        visible={confirm === 'renew'}
        title="Renew subscription?"
        message={`Extend ${current?.planName ?? 'this plan'} by one billing cycle. The server computes the new end date.`}
        confirmLabel="Renew"
        onConfirm={() => {
          setConfirm(null);
          if (current) renewMut.mutate(Number(current.id), {
            onSuccess: () => toast.success('Subscription renewed.'),
            onError: (e) => toast.error(extractApiError(e) || 'Could not renew'),
          });
        }}
        onDismiss={() => setConfirm(null)}
      />
      <ConfirmActionModal
        visible={confirm === 'suspend'}
        title="Suspend subscription?"
        message="The venue will no longer be live until a new subscription is activated."
        confirmLabel="Suspend"
        danger
        onConfirm={() => {
          setConfirm(null);
          if (current) voidMut.mutate(Number(current.id), {
            onSuccess: () => toast.success('Subscription suspended.'),
            onError: (e) => toast.error(extractApiError(e) || 'Could not suspend'),
          });
        }}
        onDismiss={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

/* ── Pending change-request card: review + edit covered courts + approve/reject ── */
function PendingRequestCard({ pending, currentPlanName }: {
  pending: SubscriptionChangeRequest; currentPlanName: string | null;
}) {
  const activateMut = useActivateChangeRequest();
  const rejectMut = useRejectChangeRequest();
  const courtsQ = useChangeRequestCourts(pending.id);
  const courts: SelectableCourt[] = courtsQ.data ?? [];
  const limit = pending.requestedPlanMaxCourts;

  // Seed the admin's selection from the owner's requested coverage once the courts load.
  const [selected, setSelected] = useState<string[] | null>(null);
  useEffect(() => {
    if (selected === null && courts.length) {
      setSelected(courts.filter((c) => c.isCovered && c.isActive).map((c) => c.courtId));
    }
  }, [courts, selected]);
  const sel = selected ?? [];

  const toggle = (c: SelectableCourt) => {
    if (!c.isActive) return;
    setSelected((prev) => {
      const base = prev ?? sel;
      if (base.includes(c.courtId)) return base.filter((x) => x !== c.courtId);
      if (base.length >= limit) {
        toast.error(`This plan covers up to ${limit} court${limit === 1 ? '' : 's'}.`);
        return base;
      }
      return [...base, c.courtId];
    });
  };

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const approve = () => {
    if (sel.length === 0) { toast.error('Select at least one court to cover.'); return; }
    activateMut.mutate({ id: Number(pending.id), courtIds: sel }, {
      onSuccess: () => toast.success('Payment recorded — subscription activated.'),
      onError: (e) => toast.error(extractApiError(e) || 'Failed'),
    });
  };

  return (
    <View style={[styles.card, shadow.card, { borderColor: colors.warning, borderWidth: 1 }]}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Pending request</Text>
        <View style={[styles.badge, { backgroundColor: colors.warning }]}>
          <Text style={styles.badgeText}>ACTION NEEDED</Text>
        </View>
      </View>
      <View style={styles.reqPlanRow}>
        <View style={styles.reqPlanBox}>
          <Text style={styles.reqPlanLabel}>Current</Text>
          <Text style={styles.reqPlanValue} numberOfLines={1}>{pending.currentPlanName ?? currentPlanName ?? 'None'}</Text>
        </View>
        <Feather name="arrow-right" size={18} color={colors.textDim} />
        <View style={styles.reqPlanBox}>
          <Text style={styles.reqPlanLabel}>Requested</Text>
          <Text style={[styles.reqPlanValue, { color: colors.admin }]} numberOfLines={1}>{pending.requestedPlanName}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Field label="Billing" value={pending.requestedCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} />
      <Field label="Price" value={`₹${pending.requestedPlanPrice.toLocaleString('en-IN')} / ${pending.requestedCycle === 'ANNUAL' ? 'yr' : 'mo'}`} />
      <Field label="Court limit" value={`up to ${limit} court${limit === 1 ? '' : 's'}`} />
      <Field label="Requested on" value={fmt(pending.createdAt)} />

      {/* Court coverage editor — admin can change which courts the subscription covers */}
      <View style={styles.divider} />
      <View style={styles.rowBetween}>
        <Text style={styles.label}>Courts to cover</Text>
        <Text style={styles.hint}>{sel.length}/{limit} selected</Text>
      </View>
      <Text style={[styles.noteText, { marginTop: 0 }]}>
        Adjust which courts go live, then approve once cash is received.
      </Text>
      {courtsQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginVertical: spacing.md }} />
      ) : courts.length === 0 ? (
        <Text style={[styles.hint, { marginTop: spacing.sm }]}>This venue has no courts to cover.</Text>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {courts.map((c) => {
            const on = sel.includes(c.courtId);
            return (
              <TouchableOpacity key={c.courtId} disabled={!c.isActive} activeOpacity={0.7} onPress={() => toggle(c)}
                style={[styles.courtRow, on && styles.courtRowOn, !c.isActive && styles.courtRowDisabled]}>
                <Feather name={on ? 'check-square' : 'square'} size={20}
                  color={!c.isActive ? colors.textDim : on ? colors.admin : colors.textMid} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courtName, !c.isActive && { color: colors.textDim }]} numberOfLines={1}>{c.name}</Text>
                  {c.sport ? <Text style={styles.hint}>{c.sport}</Text> : null}
                </View>
                {!c.isActive ? <Text style={styles.courtInactive}>Inactive</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {rejecting ? (
        <View style={{ marginTop: spacing.md }}>
          <AppInput placeholder="Reason for rejection" value={reason} onChangeText={setReason} />
          <View style={styles.actionRow}>
            <AppButton label="Confirm reject" variant="danger" style={{ flex: 1 }} disabled={rejectMut.isPending}
              onPress={() => rejectMut.mutate({ id: Number(pending.id), reason: reason || 'Not approved' }, {
                onSuccess: () => { toast.success('Request rejected.'); setRejecting(false); setReason(''); },
                onError: (e) => toast.error(extractApiError(e) || 'Failed'),
              })} />
            <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setRejecting(false)} />
          </View>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <AppButton label="Approve (cash received)" variant="primary" style={{ flex: 1 }}
            disabled={activateMut.isPending || sel.length === 0} onPress={approve} />
          <AppButton label="Reject" variant="secondary" style={{ flex: 1 }} onPress={() => { setRejecting(true); setReason(''); }} />
        </View>
      )}
    </View>
  );
}

function PlanCyclePicker({ plans, onSubmit, busy, submitPrefix, minCourts = 0, hideTrial = false }: {
  plans: SubscriptionPlan[]; busy: boolean; submitPrefix: string; minCourts?: number; hideTrial?: boolean;
  onSubmit: (planId: number, cycle: 'MONTHLY' | 'ANNUAL', asTrial: boolean) => void;
}) {
  const eligible = (p: SubscriptionPlan) => p.maxCourts >= minCourts;
  const firstEligible = plans.find(eligible) ?? plans[0];
  const [planId, setPlanId] = useState<string | null>(firstEligible?.id ?? null);
  const [cycle, setCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [asTrial, setAsTrial] = useState(false);

  useEffect(() => { if (!planId && firstEligible) setPlanId(firstEligible.id); }, [firstEligible, planId]);
  const selected = plans.find((p) => p.id === planId);

  return (
    <View>
      <Text style={[styles.label, { marginTop: spacing.md }]}>Plan</Text>
      <View style={styles.chipWrap}>
        {plans.map((p) => {
          const active = p.id === planId;
          const disabled = !eligible(p);
          return (
            <TouchableOpacity key={p.id} disabled={disabled} onPress={() => setPlanId(p.id)}
              style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}>
              <Text style={[styles.chipText, active && { color: colors.white }, disabled && { color: colors.textDim }]}>
                {p.name}{disabled ? ` (≤${p.maxCourts})` : ''}
              </Text>
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

      {!hideTrial && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Activate as trial</Text>
          <Switch value={asTrial} onValueChange={setAsTrial} />
        </View>
      )}

      <Text style={styles.noteText}>The server computes the period dates — no dates are entered here.</Text>
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

function CreateSubscriptionForm({ venueId, ownerId, venueName, minCourts }: {
  venueId: string; ownerId: string; venueName: string; minCourts: number;
}) {
  const plansQ = useAdminPlans();
  const createMut = useCreateSubscription();
  const plans = (plansQ.data ?? []).filter((p) => p.active);

  const submit = (planId: number, cycle: 'MONTHLY' | 'ANNUAL', asTrial: boolean) => {
    if (!ownerId) { toast.error('Owner not resolved for this venue.'); return; }
    createMut.mutate(
      { ownerId: Number(ownerId), venueId: Number(venueId), planId, billingCycle: cycle, asTrial, paymentMethod: 'CASH' },
      {
        onSuccess: (s) => toast.success(`Activated ${s.planName} — live until ${fmt(s.periodEnd)}.`),
        onError: (e) => toast.error(extractApiError(e) || 'Could not activate'),
      },
    );
  };

  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={styles.cardTitle}>Activate a subscription</Text>
      <Text style={styles.hint}>{venueName} has no active subscription.</Text>
      {plansQ.isLoading ? <ActivityIndicator color={colors.admin} />
        : <PlanCyclePicker plans={plans} busy={createMut.isPending} submitPrefix="Activate (venue goes live)"
            minCourts={minCourts} onSubmit={submit} />}
    </View>
  );
}

/* ── Requests tab → row-cards with inline Activate / Reject + View ─────────── */
function RequestsTab({ navigation }: { navigation: any }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const debounced = useDebounce(search, 300).trim().toLowerCase();
  const reqQ = useChangeRequests(filter);
  const plansQ = useAdminPlans();
  const [infoPlan, setInfoPlan] = useState<SubscriptionPlan | null>(null);

  const plans = plansQ.data ?? [];
  // Requested values are plan codes; current is a plan name — match either.
  const findPlan = (codeOrName?: string | null): SubscriptionPlan | null =>
    codeOrName ? (plans.find((p) => p.code === codeOrName) ?? plans.find((p) => p.name === codeOrName) ?? null) : null;

  const all = reqQ.data ?? [];
  const requests = (debounced
    ? all.filter((r) =>
        r.venueName.toLowerCase().includes(debounced) ||
        r.ownerName.toLowerCase().includes(debounced) ||
        (r.venueCity ?? '').toLowerCase().includes(debounced))
    : all)
    // Newest first (defensive; the API already returns createdAt DESC).
    .slice()
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  return (
    <View style={{ flex: 1 }}>
      <ListControls
        query={search} onQuery={setSearch}
        filters={[
          { label: 'Pending', value: 'PENDING' },
          { label: 'Approved', value: 'APPROVED' },
          { label: 'Rejected', value: 'REJECTED' },
        ]}
        active={filter} onFilter={setFilter}
        placeholder="Search venue, owner, or mobile"
      />
      {reqQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<EmptyState icon="📭" title="No requests" subtitle="Owner upgrade requests appear here." />}
          renderItem={({ item: r }) => (
            <View style={[styles.card, shadow.card]}>
              {/* Header: venue/owner + go-to-venue */}
              <View style={styles.reqHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{r.venueName}</Text>
                  <Text style={styles.hint} numberOfLines={1}>{r.ownerName}{r.venueCity ? ` · ${r.venueCity}` : ''}</Text>
                </View>
                <TouchableOpacity
                  style={styles.gotoVenueBtn}
                  onPress={() => navigation.navigate('VenueDetail', { venueId: r.venueId })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.gotoVenueText}>go to Venue</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reqPlanRow}>
                <View style={styles.reqPlanBox}>
                  <View style={styles.reqPlanLabelRow}>
                    <Text style={styles.reqPlanLabel}>Current</Text>
                    {!!findPlan(r.currentPlanName) && (
                      <TouchableOpacity style={styles.infoBtn} onPress={() => setInfoPlan(findPlan(r.currentPlanName))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="info" size={13} color={colors.textMid} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.reqPlanValue} numberOfLines={1}>{r.currentPlanName ?? 'None'}</Text>
                </View>
                <Feather name="arrow-right" size={18} color={colors.textDim} />
                <View style={styles.reqPlanBox}>
                  <View style={styles.reqPlanLabelRow}>
                    <Text style={styles.reqPlanLabel}>Requested</Text>
                    {!!findPlan(r.requestedPlanCode) && (
                      <TouchableOpacity style={[styles.infoBtn, styles.infoBtnAdmin]} onPress={() => setInfoPlan(findPlan(r.requestedPlanCode))} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Feather name="info" size={13} color={colors.admin} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.reqPlanValue, { color: colors.admin }]} numberOfLines={1}>{r.requestedPlanName}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <Field label="Court limit" value={`up to ${r.requestedPlanMaxCourts} court${r.requestedPlanMaxCourts === 1 ? '' : 's'}`} />
              <Field
                label={`Courts requested (${r.coveredCourtNames.length})`}
                value={r.coveredCourtNames.length ? r.coveredCourtNames.join(', ') : '—'}
              />
              <Field label="Requested on" value={fmt(r.createdAt)} />
              {!!r.decidedAt && <Field label="Decided on" value={fmt(r.decidedAt)} />}

              <View style={styles.reqFooter}>
                {/* Compact billing + price box */}
                <View style={styles.bpBox}>
                  <View style={styles.bpRow}>
                    <Text style={styles.bpLabel}>Billing</Text>
                    <Text style={styles.bpValue}>{r.requestedCycle === 'ANNUAL' ? 'Annual' : 'Monthly'}</Text>
                  </View>
                  <View style={styles.bpRow}>
                    <Text style={styles.bpLabel}>Price</Text>
                    <Text style={styles.bpValue}>₹{r.requestedPlanPrice.toLocaleString('en-IN')} / {r.requestedCycle === 'ANNUAL' ? 'yr' : 'mo'}</Text>
                  </View>
                </View>

                {/* Review + decide (approve/reject + court selection) on the detail page. */}
                <AppButton
                  label={filter === 'PENDING' ? 'Review' : 'View'}
                  variant={filter === 'PENDING' ? 'primary' : 'secondary'}
                  fullWidth={false}
                  style={styles.footerViewBtn}
                  onPress={() => navigation.navigate('SubscriptionDetail', { venueId: r.venueId })}
                />
              </View>
            </View>
          )}
        />
      )}
      <PlanInfoModal plan={infoPlan} onClose={() => setInfoPlan(null)} />
    </View>
  );
}

/** Prettify a feature code like AUTO_ACCEPT → "Auto Accept". */
function prettyFeature(code: string): string {
  return code.toLowerCase().split('_').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

/* ── Plan info popup (price, court limit, features) ───────────────────────── */
function PlanInfoModal({ plan, onClose }: { plan: SubscriptionPlan | null; onClose: () => void }) {
  return (
    <Modal transparent visible={!!plan} animationType="fade" onRequestClose={onClose}>
      <View style={styles.infoOverlay}>
        <View style={[styles.infoCard, shadow.modal]}>
          {plan && (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.infoTitle}>{plan.name} plan</Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.infoCloseX}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.divider} />
              <Field label="Monthly" value={`₹${plan.priceMonthly.toLocaleString('en-IN')}`} />
              <Field label="Annual" value={`₹${plan.priceAnnual.toLocaleString('en-IN')}`} />
              <Field label="Court limit" value={`up to ${plan.maxCourts} court${plan.maxCourts === 1 ? '' : 's'}`} />
              <Field label="Photos" value={`up to ${plan.photoLimit}`} />
              <Field label="Free trial" value={`${plan.trialDays} days`} />
              {plan.features.length > 0 && (
                <>
                  <Text style={[styles.reqPlanLabel, { marginTop: spacing.md, marginBottom: spacing.xs }]}>Features</Text>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="check" size={14} color={colors.success} />
                      <Text style={styles.featureText}>{prettyFeature(f)}</Text>
                    </View>
                  ))}
                </>
              )}
              <AppButton label="Close" variant="secondary" onPress={onClose} style={{ marginTop: spacing.md }} />
            </>
          )}
        </View>
      </View>
    </Modal>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.rLabel}>{label}</Text>
      <Text style={styles.rValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.sm },
  hint: { fontSize: fontSize.sm, color: colors.textDim, marginTop: 2 },
  noteText: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.sm, fontStyle: 'italic' },
  link: { color: colors.admin, fontWeight: fontWeight.semibold },
  controls: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, height: 46,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text, outlineWidth: 0 } as any,
  filterChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  filterChipText: { fontSize: fontSize.sm, color: colors.text },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  pendingStrip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md,
    backgroundColor: '#FFF7E6', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  pendingStripText: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  pendingTag: { backgroundColor: colors.warning, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  pendingTagText: { fontSize: 9, color: colors.white, fontWeight: fontWeight.bold },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, maxWidth: 220 },
  chipActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  chipDisabled: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  chipText: { fontSize: fontSize.sm, color: colors.text },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  rLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  section: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  reqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  gotoVenueBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 5 },
  gotoVenueText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.admin },
  reqFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  bpBox: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4, justifyContent: 'center',
  },
  bpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  bpLabel: { fontSize: fontSize.xs, color: colors.textDim },
  bpValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  footerActionsCol: { gap: spacing.sm, justifyContent: 'center' },
  footerBtn: { height: 36, paddingHorizontal: spacing.lg, minWidth: 104 },
  footerViewBtn: { paddingHorizontal: spacing.xl, minWidth: 104 },
  reqPlanRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  reqPlanBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reqPlanLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoBtn: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  infoBtnAdmin: { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' },
  reqPlanLabel: { fontSize: fontSize.xs, color: colors.textDim },
  reqPlanValue: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 2 },

  // Court coverage editor
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface,
  },
  courtRowOn: { borderColor: colors.admin, backgroundColor: '#F5F3FF' },
  courtRowDisabled: { backgroundColor: colors.surfaceAlt },
  courtName: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  courtInactive: { fontSize: fontSize.xs, color: colors.textDim, fontStyle: 'italic' },

  // Plan info popup
  infoOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  infoCard: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  infoTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  infoCloseX: { fontSize: 18, color: colors.textDim, fontWeight: fontWeight.bold },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  featureText: { fontSize: fontSize.sm, color: colors.textMid },
});
