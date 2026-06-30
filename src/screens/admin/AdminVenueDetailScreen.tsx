import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppButton, EmptyState } from '../../components/common';
import { centeredContent, useResponsive } from '../../responsive';
import { ConfirmActionModal } from '../../modals';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { PlanBadge } from '../../components/PlanBadge';
import { resolvePlanCode } from '../../theme/planMeta';
import { formatVenueAddress, getOpenStatus } from '../../utils/venueUtils';
import { formatRelativeTime } from '../../utils/dateUtils';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { useAdminVenueDetail, useUpdateVenueStatus } from '../../api/hooks/useVenues';
import { useAdminVenueSubscription } from '../../api/hooks/useSubscription';
import { useSports } from '../../api/hooks/useSports';
import { TONE_COLOR } from './AdminVenuesScreen';
import type { VenueActionCode } from '../../types';

const subStatusColor = (s?: string): string =>
  s === 'ACTIVE' ? colors.success : s === 'TRIALING' ? colors.info
  : s === 'PAST_DUE' ? colors.warning : colors.textDim;

/** Action → target venue status + button presentation. */
const ACTION_META: Record<VenueActionCode, {
  label: string; variant: 'primary' | 'secondary' | 'danger'; status?: string; needsReason?: boolean; confirm?: boolean;
}> = {
  APPROVE: { label: 'Approve', variant: 'primary', status: 'LIVE', confirm: true },
  REJECT: { label: 'Reject', variant: 'danger', status: 'REJECTED', needsReason: true },
  SEND_BACK: { label: 'Send back', variant: 'secondary', status: 'CHANGES_REQUESTED', needsReason: true },
  RECONSIDER: { label: 'Reconsider', variant: 'primary', status: 'PENDING', confirm: true },
  UNLIST: { label: 'Unlist', variant: 'danger', status: 'SUSPENDED', confirm: true },
  RELIST: { label: 'Relist', variant: 'primary', status: 'LIVE', confirm: true },
  EDIT: { label: 'Edit', variant: 'secondary' },
};

export default function AdminVenueDetailScreen({ navigation, route }: any) {
  const { isWide } = useResponsive();
  const venueId: string = String(route?.params?.venueId ?? '');
  const detailQ = useAdminVenueDetail(venueId);
  const updateStatus = useUpdateVenueStatus();
  const { data: sports = [] } = useSports();
  const subView = useAdminVenueSubscription(venueId).data;
  const currentSub = subView?.current ?? null;
  const coveredIds = new Set(currentSub?.coveredCourtIds ?? []);
  const sportName = (id: string) => sports.find((s) => s.id === id)?.name ?? '';

  const [reasonFor, setReasonFor] = useState<VenueActionCode | null>(null);
  const [reason, setReason] = useState('');
  const [confirmFor, setConfirmFor] = useState<VenueActionCode | null>(null);

  const detail = detailQ.data;
  const venue = detail?.venue;

  const runAction = (action: VenueActionCode, withReason?: string) => {
    const meta = ACTION_META[action];
    if (!meta.status) return;
    updateStatus.mutate(
      { id: Number(venueId), data: { status: meta.status as any, rejectionReason: withReason } },
      {
        onSuccess: () => {
          toast.success(`${meta.label} done.`);
          // Decision made → return to the venues list (the mutation already invalidated it, so the
          // queue refreshes). The toast renders above navigation, so it's still visible after the pop.
          if (navigation.canGoBack()) navigation.goBack();
        },
        onError: (e) => toast.error(extractApiError(e) || `Could not ${meta.label.toLowerCase()}`),
      },
    );
  };

  const onAction = (action: VenueActionCode) => {
    const meta = ACTION_META[action];
    if (action === 'EDIT') { toast.info('Editing venues from admin is coming soon.'); return; }
    if (meta.needsReason) { setReason(''); setReasonFor(action); return; }
    if (meta.confirm) { setConfirmFor(action); return; }
    runAction(action);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={venue?.name ?? 'Venue'} onBack={() => navigation.goBack()} />

      {detailQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : !detail || !venue ? (
        <EmptyState icon="⚠️" title="Could not load" subtitle="Try again in a moment." />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl, ...centeredContent }}>
            {/* Hero */}
            {venue.coverPhoto ? (
              <Image source={{ uri: venue.coverPhoto }} style={styles.hero} />
            ) : (
              <View style={[styles.hero, styles.heroPlaceholder]}>
                <Text style={styles.heroPlaceholderText}>{(venue.name || '?').charAt(0).toUpperCase()}</Text>
              </View>
            )}

            {/* Title block */}
            <Text style={styles.name}>{venue.name}</Text>
            <Text style={styles.addr}>📍 {formatVenueAddress(venue.address, venue.city, venue.state, venue.pincode)}</Text>
            <View style={styles.subLine}>
              <Text style={[styles.openPill, isOpen(venue.openTime, venue.closeTime) ? styles.openPillOpen : styles.openPillClosed]}>
                {getOpenStatus(venue.openTime, venue.closeTime).label}
              </Text>
              <Text style={styles.price}>₹{venue.pricePerHour}/hr</Text>
            </View>

            {/* Submission + status */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardLabel}>
                  Submitted {detail.submittedAt ? formatRelativeTime(detail.submittedAt) : '—'}
                </Text>
                <View style={[styles.badge, { backgroundColor: TONE_COLOR[detail.statusTone] }]}>
                  <Text style={styles.badgeText}>{detail.statusLabel}</Text>
                </View>
              </View>
              {detail.rejectionReason ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Rejection reason</Text>
                  <Text style={styles.noteText}>{detail.rejectionReason}</Text>
                </View>
              ) : null}
              {detail.changeNotes ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Requested changes</Text>
                  <Text style={styles.noteText}>{detail.changeNotes}</Text>
                </View>
              ) : null}
            </View>

            {/* Completeness */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Completeness</Text>
                <Text style={styles.percent}>{detail.completeness.percent}%</Text>
              </View>
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                {detail.completeness.checks.map((c) => (
                  <View key={c.key} style={styles.checkRow}>
                    <Feather
                      name={c.done ? 'check-circle' : 'x-circle'}
                      size={16}
                      color={c.done ? colors.success : colors.textDim}
                    />
                    <Text style={[styles.checkLabel, !c.done && { color: colors.textDim }]}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Owner */}
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.cardTitle}>{detail.owner.name}</Text>
              <Text style={styles.muted}>
                Registered {detail.owner.registeredOn ? formatRelativeTime(detail.owner.registeredOn) : '—'}
                {'  ·  '}{detail.ownerHistory.totalVenues} venues · {detail.ownerHistory.liveVenues} live
              </Text>
              <View style={styles.contactRow}>
                {detail.owner.phone ? (
                  <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${detail.owner.phone}`)}
                    accessibilityRole="button" accessibilityLabel="Call owner">
                    <Feather name="phone" size={15} color={colors.admin} />
                    <Text style={styles.contactText}>Call</Text>
                  </TouchableOpacity>
                ) : null}
                {detail.owner.email ? (
                  <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`mailto:${detail.owner.email}`)}
                    accessibilityRole="button" accessibilityLabel="Email owner">
                    <Feather name="mail" size={15} color={colors.admin} />
                    <Text style={styles.contactText} numberOfLines={1}>{detail.owner.email}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Subscription + court coverage */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Subscription</Text>
                <View style={[styles.badge, { backgroundColor: subStatusColor(currentSub?.status) }]}>
                  <Text style={styles.badgeText}>{currentSub ? currentSub.status : 'NONE'}</Text>
                </View>
              </View>
              {currentSub ? (
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {resolvePlanCode(currentSub.planCode) ?? resolvePlanCode(currentSub.planName) ? (
                      <PlanBadge plan={(resolvePlanCode(currentSub.planCode) ?? resolvePlanCode(currentSub.planName))!} size="sm" />
                    ) : null}
                    <Text style={styles.muted}>
                      ₹{currentSub.price.toLocaleString('en-IN')}/{currentSub.billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                    </Text>
                  </View>
                  <Text style={styles.muted}>
                    Covered courts ({currentSub.coveredCourtNames.length}/{currentSub.maxCourts}): {currentSub.coveredCourtNames.length ? currentSub.coveredCourtNames.join(', ') : '—'}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.muted, { marginTop: spacing.sm }]}>
                  No active subscription — players can't book this venue yet.
                </Text>
              )}
              <TouchableOpacity onPress={() => navigation.navigate('SubscriptionDetail', { venueId })} style={{ marginTop: spacing.md }}>
                <Text style={styles.linkText}>Manage subscription →</Text>
              </TouchableOpacity>
            </View>

            {/* Courts (with live / coverage state) */}
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.cardTitle}>Courts ({venue.courts.length})</Text>
              {venue.courts.length === 0 ? (
                <Text style={[styles.muted, { marginTop: spacing.sm }]}>No courts added yet.</Text>
              ) : (
                venue.courts.map((c) => {
                  // Deleted is admin-only (owners/players never receive these) and takes precedence
                  // over the live/coverage badge so it's unmistakable a court was removed.
                  const deleted = c.isDeleted;
                  const live = !deleted && coveredIds.has(c.id) && c.isActive;
                  const label = deleted ? 'Deleted' : live ? 'Live' : !c.isActive ? 'Inactive' : 'Not covered';
                  const badgeBg = deleted ? '#FDE8E8' : live ? '#E6F7EE' : colors.surfaceAlt;
                  const badgeFg = deleted ? colors.danger : live ? colors.success : colors.textMid;
                  return (
                    <View key={c.id} style={styles.courtRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.courtName, deleted && { textDecorationLine: 'line-through', color: colors.textMid }]}>{c.name}</Text>
                        <Text style={styles.courtMeta}>
                          {[sportName(c.sportId), c.type, `₹${c.effectivePricePerHour}/hr`].filter(Boolean).join('  ·  ')}
                        </Text>
                      </View>
                      <View style={[styles.courtBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.courtBadgeText, { color: badgeFg }]}>{label}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Sports & amenities */}
            {(venue.sports.length > 0 || venue.amenities.length > 0) && (
              <View style={[styles.card, shadow.card]}>
                {venue.sports.length > 0 && (
                  <>
                    <Text style={styles.cardTitle}>Sports</Text>
                    <View style={styles.chipWrap}>
                      {venue.sports.map((sid) => (
                        <View key={sid} style={styles.chip}><Text style={styles.chipText}>{sportName(sid) || sid}</Text></View>
                      ))}
                    </View>
                  </>
                )}
                {venue.amenities.length > 0 && (
                  <>
                    <Text style={[styles.cardTitle, { marginTop: venue.sports.length > 0 ? spacing.md : 0 }]}>Amenities</Text>
                    <View style={styles.chipWrap}>
                      {venue.amenities.map((a) => (
                        <View key={a} style={styles.chip}><Text style={styles.chipText}>{a}</Text></View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Sticky action bar (from availableActions). On wide screens the buttons are compact and
              right-aligned inside the content band; on phone they stay full-width (mobile unchanged). */}
          {detail.availableActions.length > 0 && (
            <View style={styles.actionBar}>
              <View style={[styles.actionBarInner, isWide && styles.actionBarInnerWide]}>
                {detail.availableActions.map((a) => {
                  const meta = ACTION_META[a];
                  return (
                    <AppButton
                      key={a}
                      label={meta.label}
                      variant={meta.variant}
                      fullWidth={!isWide}
                      style={isWide ? { paddingHorizontal: spacing.xl } : { flex: 1 }}
                      disabled={updateStatus.isPending}
                      onPress={() => onAction(a)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </>
      )}

      {/* Reason sheet (Reject / Send back) */}
      <ReasonSheet
        visible={reasonFor !== null}
        title={reasonFor === 'REJECT' ? 'Reject venue' : 'Send back for changes'}
        placeholder={reasonFor === 'REJECT' ? 'Reason for rejection' : 'What needs to change?'}
        confirmLabel={reasonFor === 'REJECT' ? 'Reject' : 'Send back'}
        danger={reasonFor === 'REJECT'}
        value={reason}
        onChange={setReason}
        busy={updateStatus.isPending}
        onConfirm={() => {
          if (!reason.trim() || !reasonFor) return;
          const action = reasonFor;
          setReasonFor(null);
          runAction(action, reason.trim());
        }}
        onClose={() => setReasonFor(null)}
      />

      {/* Confirm sheet (Approve / Reconsider / Unlist / Relist) */}
      <ConfirmActionModal
        visible={confirmFor !== null}
        title={confirmFor ? `${ACTION_META[confirmFor].label} venue?` : ''}
        message={confirmMessage(confirmFor)}
        confirmLabel={confirmFor ? ACTION_META[confirmFor].label : 'Confirm'}
        danger={confirmFor === 'UNLIST'}
        onConfirm={() => { const a = confirmFor; setConfirmFor(null); if (a) runAction(a); }}
        onDismiss={() => setConfirmFor(null)}
      />
    </SafeAreaView>
  );
}

function isOpen(open: string, close: string): boolean {
  return getOpenStatus(open, close).isOpen;
}

function confirmMessage(action: VenueActionCode | null): string {
  switch (action) {
    case 'APPROVE': return 'Approve this venue? The owner can then start a trial and pick which courts to make bookable.';
    case 'RECONSIDER': return 'Move this rejected venue back to the pending queue?';
    case 'UNLIST': return 'Unlist this venue? It will be hidden from players until re-listed.';
    case 'RELIST': return 'Re-list this venue so it is visible to players again?';
    default: return '';
  }
}

function ReasonSheet({ visible, title, placeholder, confirmLabel, danger, value, onChange, busy, onConfirm, onClose }: {
  visible: boolean; title: string; placeholder: string; confirmLabel: string; danger?: boolean;
  value: string; onChange: (v: string) => void; busy: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textDim}
            value={value}
            onChangeText={onChange}
            multiline
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
            <AppButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              style={{ flex: 1 }}
              disabled={busy || !value.trim()}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { width: '100%', height: 180, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderText: { fontSize: 48, fontWeight: fontWeight.bold, color: colors.textDim },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.md },
  addr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  subLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  openPill: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  openPillOpen: { backgroundColor: '#E6F7EE', color: colors.success },
  openPillClosed: { backgroundColor: colors.surfaceAlt, color: colors.textMid },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  cardLabel: { fontSize: fontSize.sm, color: colors.textMid, flexShrink: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  noteBox: { marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  noteLabel: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold, marginBottom: 2 },
  noteText: { fontSize: fontSize.sm, color: colors.text },
  percent: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.admin },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkLabel: { fontSize: fontSize.sm, color: colors.text },
  muted: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  linkText: { fontSize: fontSize.sm, color: colors.admin, fontWeight: fontWeight.semibold },
  courtRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  courtName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  courtMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  courtBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  courtBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  chipText: { fontSize: fontSize.xs, color: colors.textMid, fontWeight: fontWeight.medium },
  contactRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxWidth: '70%' },
  contactText: { fontSize: fontSize.sm, color: colors.admin, fontWeight: fontWeight.semibold },
  actionBar: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  actionBarInner: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  actionBarInnerWide: { justifyContent: 'flex-end' },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  reasonInput: {
    minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, fontSize: fontSize.md, color: colors.text, textAlignVertical: 'top', outlineWidth: 0,
  } as any,
});
