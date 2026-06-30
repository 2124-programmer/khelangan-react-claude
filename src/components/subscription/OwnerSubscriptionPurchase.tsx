import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { PlanBadge } from '../PlanBadge';
import { resolvePlanCode } from '../../theme/planMeta';
import { AppButton } from '../common';
import { toast } from '../../toast';
import { extractApiError } from '../../api/client';
import {
  useOwnerSubscriptionState, useOwnerPlanOptions, useOwnerSelectableCourts,
  useStartVenueTrial, useCreateVenueSubscriptionRequest, useCancelVenueSubscriptionRequest,
} from '../../api/hooks/useSubscription';
import { formatRelativeTime } from '../../utils/dateUtils';
import type {
  PlanOption, PaidPlanCode, SelectableCourt, VenueSubscriptionState,
} from '../../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s: string | null): string {
  if (!s) return '';
  const d = new Date(`${s}T00:00:00`);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function daysUntil(s: string | null): number {
  if (!s) return 0;
  const end = new Date(`${s}T00:00:00`).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(0, Math.ceil((end - today) / 86_400_000));
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  venueId: string | number;
  onAddCourt?: () => void;
}

/** Owner-only subscription state + purchase CTA, shown atop the Courts section in venue preview. */
export function OwnerSubscriptionCard({ venueId, onAddCourt }: CardProps) {
  const { data: state, isLoading } = useOwnerSubscriptionState(venueId);
  const [flowOpen, setFlowOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  if (isLoading || !state) {
    return (
      <View style={[styles.card, shadow.card]}>
        <ActivityIndicator color={colors.owner} />
      </View>
    );
  }

  const blocked = state.blockReason === 'NO_COURTS';
  const pending = !!state.pendingRequest;
  const k = state.bookableCourts;
  const limit = state.courtLimit ?? state.totalCourts;

  let title: string;
  let subtitle: string;
  let ctaLabel: string;
  let tone: 'neutral' | 'green' | 'amber' | 'red' = 'neutral';

  if (blocked) {
    title = 'Subscription';
    subtitle = 'Add at least one court before purchasing a subscription.';
    ctaLabel = 'Purchase';
    tone = 'amber';
  } else if (pending) {
    const pr = state.pendingRequest!;
    const courtN = pr.coveredCourtIds.length;
    title = `${pr.planName ?? pr.planCode} requested`;
    subtitle = `${courtN} court${courtN === 1 ? '' : 's'} · pending admin activation${pr.requestedAt ? ` · requested ${formatRelativeTime(pr.requestedAt)}` : ''}`;
    ctaLabel = 'View request';
    tone = 'amber';
  } else if (state.status === 'TRIAL') {
    title = `Trial · ${daysUntil(state.endDate)}d left`;
    subtitle = `${k}/${limit} court${limit === 1 ? '' : 's'} live for players`;
    ctaLabel = 'Upgrade';
    tone = 'green';
  } else if (state.status === 'ACTIVE') {
    title = `${state.planName ?? 'Plan'} · ${k}/${limit} courts active`;
    subtitle = state.endDate ? `Renews ${fmtDate(state.endDate)}` : 'Active';
    ctaLabel = 'Manage';
    tone = 'green';
  } else if (state.status === 'EXPIRED' || state.status === 'CANCELED') {
    title = 'Subscription expired';
    subtitle = 'Renew to make your courts bookable again.';
    ctaLabel = 'Renew';
    tone = 'red';
  } else {
    title = 'No active subscription';
    subtitle = "Players can't book this venue yet.";
    ctaLabel = 'Purchase';
    tone = 'neutral';
  }

  const dot = tone === 'green' ? colors.success
    : tone === 'amber' ? colors.warning
    : tone === 'red' ? colors.danger
    : colors.textDim;

  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.cardHead}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {(state.status === 'ACTIVE' || state.status === 'TRIAL') && state.coveredCourtNames.length > 0 && (
        <Text style={styles.cardCourts}>Courts live: {state.coveredCourtNames.join(', ')}</Text>
      )}

      {blocked ? (
        <AppButton label="Add a court" variant="secondary" onPress={() => onAddCourt?.()} style={{ marginTop: spacing.md }} />
      ) : pending ? (
        <AppButton
          label={ctaLabel}
          variant="secondary"
          onPress={() => setRequestOpen(true)}
          style={{ marginTop: spacing.md }}
        />
      ) : (
        <AppButton
          label={ctaLabel}
          variant={tone === 'green' ? 'secondary' : 'primary'}
          disabled={!state.canStartTrial && !state.canPurchasePaid}
          onPress={() => setFlowOpen(true)}
          style={{ marginTop: spacing.md }}
        />
      )}

      <PurchaseFlow
        visible={flowOpen}
        venueId={Number(venueId)}
        state={state}
        onClose={() => setFlowOpen(false)}
      />
      <RequestDetailsSheet
        visible={requestOpen}
        venueId={Number(venueId)}
        state={state}
        onClose={() => setRequestOpen(false)}
      />
    </View>
  );
}

// ─── Pending request details (view + cancel) ──────────────────────────────────

interface RequestSheetProps {
  visible: boolean;
  venueId: number;
  state: VenueSubscriptionState;
  onClose: () => void;
}

function RequestDetailsSheet({ visible, venueId, state, onClose }: RequestSheetProps) {
  const cancel = useCancelVenueSubscriptionRequest(venueId);
  const pr = state.pendingRequest;
  if (!pr) return null;

  const doCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success('Request cancelled.');
      onClose();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.handle} />
          <View style={styles.sheetHead}>
            <View style={{ width: 22 }} />
            <Text style={styles.sheetTitle}>Plan request</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusPill}>
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            <Text style={styles.statusPillText}>Pending admin activation after payment</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan</Text>
            {resolvePlanCode(pr.planCode) ? (
              <PlanBadge plan={resolvePlanCode(pr.planCode)!} showInfo />
            ) : (
              <Text style={styles.detailValue}>{pr.planName ?? pr.planCode}</Text>
            )}
          </View>
          <Row
            label={`Courts (${pr.coveredCourtNames.length})`}
            value={pr.coveredCourtNames.length ? pr.coveredCourtNames.join(', ') : '—'}
          />
          {!!pr.requestedAt && <Row label="Requested" value={formatRelativeTime(pr.requestedAt)} />}

          <Text style={styles.requestHint}>
            An admin activates your plan once offline payment is confirmed. Your selected courts go
            live for players on activation. Need different courts? Cancel and submit a new request.
          </Text>

          <View style={styles.sheetFooter}>
            <AppButton
              label="Cancel request"
              variant="danger"
              loading={cancel.isPending}
              disabled={cancel.isPending}
              onPress={doCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Purchase flow (plans → details → court selection) ────────────────────────

type Step = 'plans' | 'trialDetails' | 'planDetails' | 'courts';

interface FlowProps {
  visible: boolean;
  venueId: number;
  state: VenueSubscriptionState;
  onClose: () => void;
}

function PurchaseFlow({ visible, venueId, state, onClose }: FlowProps) {
  const [step, setStep] = useState<Step>('plans');
  const [plan, setPlan] = useState<PlanOption | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: options = [], isLoading: loadingPlans } = useOwnerPlanOptions(venueId, visible);
  const { data: courts = [], isLoading: loadingCourts } = useOwnerSelectableCourts(venueId, visible && step === 'courts');
  const startTrial = useStartVenueTrial(venueId);
  const createRequest = useCreateVenueSubscriptionRequest(venueId);

  // Reset to the plans step each time the sheet opens.
  useEffect(() => {
    if (visible) { setStep('plans'); setPlan(null); setSelected(new Set()); }
  }, [visible]);

  const limit = plan ? plan.courtLimit : 0;
  const activeCourts = useMemo(() => courts.filter((c) => c.isActive), [courts]);

  // Seed the selection when entering the court step. Default = all active courts (up to the limit)
  // pre-checked, but the owner can DESELECT to activate fewer (e.g. 1 of 2). No forced selection.
  useEffect(() => {
    if (step !== 'courts' || loadingCourts) return;
    if (activeCourts.length <= limit) {
      setSelected(new Set(activeCourts.map((c) => c.courtId)));
    } else {
      // Prefer already-covered courts, else empty for a deliberate pick.
      const pre = courts.filter((c) => c.isCovered && c.isActive).map((c) => c.courtId).slice(0, limit);
      setSelected(new Set(pre));
    }
  }, [step, loadingCourts]); // eslint-disable-line react-hooks/exhaustive-deps

  const choosePlan = (opt: PlanOption) => {
    if (!opt.available) return;
    setPlan(opt);
    setStep(opt.kind === 'TRIAL' ? 'trialDetails' : 'planDetails');
  };

  const toggleCourt = (courtId: string, isActive: boolean) => {
    if (!isActive) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courtId)) { next.delete(courtId); return next; }
      if (next.size >= limit) return prev; // block selecting beyond the limit
      next.add(courtId);
      return next;
    });
  };

  const confirm = async () => {
    const courtIds = Array.from(selected);
    if (courtIds.length === 0 || !plan) return;
    try {
      if (plan.kind === 'TRIAL') {
        await startTrial.mutateAsync({ courtIds });
        toast.success('Trial started — your selected courts are now live for players.');
      } else {
        await createRequest.mutateAsync({ planCode: plan.code as PaidPlanCode, courtIds });
        toast.success('Request submitted — pending admin activation after payment.');
      }
      onClose();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const submitting = startTrial.isPending || createRequest.isPending;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.handle} />

          {/* Header with contextual back */}
          <View style={styles.sheetHead}>
            {step !== 'plans' ? (
              <TouchableOpacity onPress={() => setStep('plans')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-left" size={22} color={colors.text} />
              </TouchableOpacity>
            ) : <View style={{ width: 22 }} />}
            <Text style={styles.sheetTitle}>
              {step === 'plans' ? 'Choose a plan'
                : step === 'trialDetails' ? 'Free trial'
                : step === 'planDetails' ? plan?.name
                : 'Choose courts'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {/* ── Plans ── */}
            {step === 'plans' && (
              loadingPlans ? <ActivityIndicator color={colors.owner} style={{ marginVertical: spacing.xl }} /> : (
                options.map((opt) => (
                  <TouchableOpacity
                    key={opt.code}
                    style={[styles.planRow, !opt.available && styles.planRowDisabled]}
                    activeOpacity={opt.available ? 0.7 : 1}
                    onPress={() => choosePlan(opt)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.planRowTop}>
                        <PlanBadge plan={opt.code} />
                        {opt.kind === 'TRIAL' && <View style={styles.freeTag}><Text style={styles.freeTagText}>FREE</Text></View>}
                      </View>
                      <Text style={styles.planMeta}>
                        {opt.price === 0 ? `${opt.durationDays} days` : `₹${opt.price}/mo`} · up to {opt.courtLimit} court{opt.courtLimit === 1 ? '' : 's'}
                      </Text>
                      {!opt.available && !!opt.unavailableReason && (
                        <Text style={styles.planUnavailable}>{opt.unavailableReason}</Text>
                      )}
                    </View>
                    {opt.available && <Feather name="chevron-right" size={20} color={colors.textDim} />}
                  </TouchableOpacity>
                ))
              )
            )}

            {/* ── Trial details ── */}
            {step === 'trialDetails' && plan && (
              <View style={styles.detailBox}>
                <Text style={styles.detailLead}>Free {plan.durationDays}-day trial</Text>
                <Bullet text={`Activate up to ${plan.courtLimit} courts for players to book`} />
                <Bullet text="Players can book only the courts you activate" />
                <Bullet text="One trial per venue" />
                <Bullet text="Upgrade to a paid plan anytime to add more courts" />
              </View>
            )}

            {/* ── Paid plan details ── */}
            {step === 'planDetails' && plan && (
              <View style={styles.detailBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  <PlanBadge plan={plan.code} />
                  <Text style={styles.detailLead}>₹{plan.price}/mo</Text>
                </View>
                <Bullet text={`Cover up to ${plan.courtLimit} courts`} />
                <Bullet text="Payment is collected offline; an admin activates your plan" />
                <Bullet text="Only the courts you select become bookable" />
              </View>
            )}

            {/* ── Court selection ── */}
            {step === 'courts' && plan && (
              loadingCourts ? <ActivityIndicator color={colors.owner} style={{ marginVertical: spacing.xl }} /> : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                    <Text style={styles.instruction}>Courts for</Text>
                    <PlanBadge plan={plan.code} size="sm" />
                  </View>
                  <Text style={styles.instruction}>
                    {plan.kind === 'TRIAL'
                      ? `Choose up to ${plan.courtLimit} court${plan.courtLimit === 1 ? '' : 's'} to activate for your free trial. You can activate fewer and add the rest later.`
                      : `Choose up to ${plan.courtLimit} court${plan.courtLimit === 1 ? '' : 's'} to cover.`}
                  </Text>
                  <Text style={styles.counter}>{selected.size}/{limit} selected</Text>
                  {courts.map((c) => {
                    const checked = selected.has(c.courtId);
                    const disabled = !c.isActive || (!checked && selected.size >= limit);
                    return (
                      <TouchableOpacity
                        key={c.courtId}
                        style={[styles.courtRow, disabled && !checked && styles.courtRowDisabled]}
                        activeOpacity={0.7}
                        onPress={() => toggleCourt(c.courtId, c.isActive)}
                      >
                        <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                          {checked && <Feather name="check" size={14} color={colors.white} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.courtRowName}>{c.name}</Text>
                          {(c.sport || !c.isActive) && (
                            <Text style={styles.courtRowMeta}>
                              {c.sport ?? ''}{!c.isActive ? `${c.sport ? ' · ' : ''}Inactive` : ''}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </ScrollView>

          {/* Footer CTA */}
          <View style={styles.sheetFooter}>
            {step === 'trialDetails' && (
              <AppButton label="Start trial" onPress={() => setStep('courts')} />
            )}
            {step === 'planDetails' && (
              <AppButton label="Choose courts" onPress={() => setStep('courts')} />
            )}
            {step === 'courts' && (
              <AppButton
                label={plan?.kind === 'TRIAL' ? 'Start trial' : 'Submit request'}
                loading={submitting}
                disabled={selected.size === 0 || submitting}
                onPress={confirm}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Feather name="check-circle" size={15} color={colors.success} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ─── Compact subscription strip for the My Venues card ────────────────────────

type StripTone = 'green' | 'amber' | 'red' | 'neutral';
const STRIP_PALETTE: Record<StripTone, { bg: string; fg: string }> = {
  green: { bg: '#DCFCE7', fg: '#15803D' },
  amber: { bg: '#FEF3C7', fg: '#B45309' },
  red: { bg: '#FEE2E2', fg: '#B91C1C' },
  neutral: { bg: colors.surfaceAlt, fg: colors.textMid },
};

interface StripProps {
  venueId: string | number;
  /** Tapping the strip routes to where the owner manages the subscription (venue preview). */
  onManage: () => void;
}

/**
 * Status-aware subscription strip for a live venue's My-Venues card. Reflects the full
 * court-coverage model: required / trial+days / active plan / pending request / expired.
 */
export function VenueSubscriptionStrip({ venueId, onManage }: StripProps) {
  const { data: state } = useOwnerSubscriptionState(venueId);
  if (!state) return null;

  const k = state.bookableCourts;
  const limit = state.courtLimit ?? state.totalCourts;
  let icon: React.ComponentProps<typeof Feather>['name'] = 'credit-card';
  let tone: StripTone = 'neutral';
  let title = '';
  let sub = '';
  let cta = 'Manage';

  if (state.blockReason === 'NO_COURTS') {
    icon = 'alert-triangle'; tone = 'amber';
    title = 'Add a court to go live';
    sub = 'A subscription needs at least one court';
    cta = 'Add';
  } else if (state.pendingRequest) {
    const pr = state.pendingRequest;
    icon = 'clock'; tone = 'amber';
    title = `${pr.planName ?? pr.planCode} requested`;
    sub = `${pr.coveredCourtIds.length} court${pr.coveredCourtIds.length === 1 ? '' : 's'} · pending admin activation`;
    cta = 'View';
  } else if (state.status === 'TRIAL') {
    const left = daysUntil(state.endDate);
    icon = 'zap'; tone = left <= 7 ? 'amber' : 'green';
    title = `Trial · ${left}d left`;
    sub = `${k}/${limit} court${limit === 1 ? '' : 's'} live · upgrade to a paid plan`;
    cta = 'Upgrade';
  } else if (state.status === 'ACTIVE') {
    icon = 'check-circle'; tone = 'green';
    title = `${state.planName ?? 'Plan'} · ${k}/${limit} courts`;
    sub = state.endDate ? `Renews ${fmtDate(state.endDate)}` : 'Active';
    cta = 'Manage';
  } else if (state.status === 'EXPIRED' || state.status === 'CANCELED') {
    icon = 'alert-circle'; tone = 'red';
    title = 'Subscription expired';
    sub = 'Renew to make your courts bookable';
    cta = 'Renew';
  } else {
    icon = 'lock'; tone = 'red';
    title = 'Subscription required';
    sub = 'Start a free trial to make courts bookable';
    cta = 'Start';
  }

  const palette = STRIP_PALETTE[tone];
  return (
    <TouchableOpacity
      style={[styles.strip, { backgroundColor: palette.bg }]}
      activeOpacity={0.8}
      onPress={onManage}
    >
      <Feather name={icon} size={18} color={palette.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.stripTitle, { color: palette.fg }]} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={styles.stripSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <Text style={[styles.stripCta, { color: palette.fg }]}>{cta}</Text>
      <Feather name="chevron-right" size={16} color={palette.fg} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4, lineHeight: 19 },
  cardCourts: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.semibold, marginTop: 4 },

  // Sheet
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingBottom: spacing.xxl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  closeX: { fontSize: 18, color: colors.textDim, fontWeight: fontWeight.bold },

  // Plan rows
  planRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm,
  },
  planRowDisabled: { opacity: 0.55 },
  planRowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  planName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  planMeta: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  planUnavailable: { fontSize: fontSize.xs, color: colors.danger, marginTop: 3 },
  freeTag: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 1, borderRadius: radius.sm },
  freeTagText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.primaryDark },

  // Detail box
  detailBox: { paddingVertical: spacing.sm },
  detailLead: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bulletText: { flex: 1, fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },

  // Court selection
  instruction: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium, marginBottom: spacing.sm, lineHeight: 20 },
  counter: { fontSize: fontSize.xs, color: colors.textDim, marginBottom: spacing.sm },
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
  },
  courtRowDisabled: { opacity: 0.5 },
  checkbox: {
    width: 22, height: 22, borderRadius: radius.sm,
    borderWidth: 2, borderColor: colors.borderDark,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  courtRowName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  courtRowMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },

  sheetFooter: { marginTop: spacing.md },

  // Request details
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: '#FEF3C7', borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md,
  },
  statusPillText: { flex: 1, fontSize: fontSize.xs, color: '#B45309', fontWeight: fontWeight.semibold },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: fontSize.sm, color: colors.textMid },
  detailValue: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold, textAlign: 'right' },
  requestHint: { fontSize: fontSize.xs, color: colors.textDim, lineHeight: 18, marginTop: spacing.md },

  // My-Venues subscription strip
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  stripTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  stripSub: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  stripCta: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
