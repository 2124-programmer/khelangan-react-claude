import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Linking, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppButton, EmptyState, AvatarImage } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { formatRelativeTime } from '../../utils/dateUtils';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import {
  usePlayerDetail, usePlayerBookings, usePlayerPayments, usePlayerAudit,
  useSuspendPlayer, useReactivatePlayer, useBanPlayer, useUnbanPlayer,
  useSetPlayerVerification, useForceLogoutPlayer, useResetPlayerPassword, useMessagePlayer,
} from '../../api/hooks/usePlayers';
import { PLAYER_STATUS_COLOR } from './AdminPlayersScreen';
import type { PlayerActionCode } from '../../types';

const BAR_ACTIONS: Record<string, { label: string; variant: 'primary' | 'secondary' | 'danger' }> = {
  SUSPEND: { label: 'Suspend', variant: 'danger' },
  BAN: { label: 'Ban', variant: 'danger' },
  REACTIVATE: { label: 'Reactivate', variant: 'primary' },
  UNBAN: { label: 'Unban', variant: 'primary' },
  FORCE_LOGOUT: { label: 'Force logout', variant: 'secondary' },
  RESET_PASSWORD: { label: 'Reset password', variant: 'secondary' },
  MESSAGE: { label: 'Message', variant: 'secondary' },
};
// Verify/Unverify are surfaced as toggles in the identity card, not bar buttons.
const BAR_ORDER: PlayerActionCode[] = ['REACTIVATE', 'UNBAN', 'MESSAGE', 'FORCE_LOGOUT', 'RESET_PASSWORD', 'SUSPEND', 'BAN'];

export default function PlayerDetailScreen({ navigation, route }: any) {
  const playerId: string = String(route?.params?.playerId ?? '');
  const numId = Number(playerId);
  const detailQ = usePlayerDetail(playerId);
  const [tab, setTab] = useState<'bookings' | 'payments' | 'audit'>('bookings');

  const suspendMut = useSuspendPlayer();
  const reactivateMut = useReactivatePlayer();
  const banMut = useBanPlayer();
  const unbanMut = useUnbanPlayer();
  const verifyMut = useSetPlayerVerification();
  const forceLogoutMut = useForceLogoutPlayer();
  const resetMut = useResetPlayerPassword();
  const messageMut = useMessagePlayer();

  const [reasonFor, setReasonFor] = useState<'SUSPEND' | 'BAN' | null>(null);
  const [reason, setReason] = useState('');
  const [confirmFor, setConfirmFor] = useState<PlayerActionCode | null>(null);
  const [composing, setComposing] = useState(false);

  const d = detailQ.data;
  const busy = suspendMut.isPending || banMut.isPending || reactivateMut.isPending || unbanMut.isPending
    || forceLogoutMut.isPending || resetMut.isPending;

  const ok = (msg: string) => toast.success(msg);
  const err = (e: unknown, m: string) => toast.error(extractApiError(e) || m);

  const onBarAction = (a: PlayerActionCode) => {
    switch (a) {
      case 'SUSPEND': setReason(''); setReasonFor('SUSPEND'); break;
      case 'BAN': setReason(''); setReasonFor('BAN'); break;
      case 'MESSAGE': setComposing(true); break;
      default: setConfirmFor(a); break;
    }
  };

  const runConfirm = (a: PlayerActionCode) => {
    setConfirmFor(null);
    if (a === 'REACTIVATE') reactivateMut.mutate(numId, { onSuccess: () => ok('Player reactivated.'), onError: (e) => err(e, 'Failed') });
    else if (a === 'UNBAN') unbanMut.mutate(numId, { onSuccess: () => ok('Player unbanned.'), onError: (e) => err(e, 'Failed') });
    else if (a === 'FORCE_LOGOUT') forceLogoutMut.mutate(numId, { onSuccess: () => ok('All sessions invalidated.'), onError: (e) => err(e, 'Failed') });
    else if (a === 'RESET_PASSWORD') resetMut.mutate(numId, { onSuccess: () => ok('Password reset link sent.'), onError: (e) => err(e, 'Failed') });
  };

  const toggleVerify = (channel: 'EMAIL' | 'PHONE', current: boolean) => {
    verifyMut.mutate({ id: numId, body: { channel, verified: !current } }, {
      onSuccess: () => ok(`${channel === 'EMAIL' ? 'Email' : 'Phone'} ${!current ? 'verified' : 'unverified'}.`),
      onError: (e) => err(e, 'Failed'),
    });
  };

  const canVerify = d?.availableActions.includes('VERIFY');
  const barActions = (d?.availableActions ?? []).filter((a) => BAR_ACTIONS[a]);
  const orderedBar = BAR_ORDER.filter((a) => barActions.includes(a));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={d?.name ?? 'Player'} onBack={() => navigation.goBack()} />

      {detailQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : !d ? (
        <EmptyState icon="⚠️" title="Could not load" subtitle="Try again in a moment." />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
            {d.status === 'DELETED' && (
              <View style={styles.deletedBanner}>
                <Text style={styles.deletedText}>
                  Account deleted{d.deletion?.deletedAt ? ` ${formatRelativeTime(d.deletion.deletedAt)}` : ''}
                  {d.deletion?.deletedByName ? ` by ${d.deletion.deletedByName}` : ''}
                  {d.deletion?.reason ? ` — ${d.deletion.reason}` : ''}.
                </Text>
              </View>
            )}

            {/* Identity */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.identityTop}>
                <AvatarImage name={d.name} uri={d.avatarUrl ?? undefined} size={56} />
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>{d.name}</Text>
                    <View style={[styles.badge, { backgroundColor: PLAYER_STATUS_COLOR[d.status] }]}>
                      <Text style={styles.badgeText}>{d.status}</Text>
                    </View>
                  </View>
                  {d.city ? <Text style={styles.muted}>{d.city}</Text> : null}
                  <Text style={styles.muted}>Joined {d.joinedAt ? formatRelativeTime(d.joinedAt) : '—'}</Text>
                </View>
              </View>

              <View style={styles.divider} />
              {/* Email */}
              <View style={styles.contactRow}>
                <Feather name="mail" size={15} color={colors.textMid} />
                <TouchableOpacity disabled={!d.email} onPress={() => d.email && Linking.openURL(`mailto:${d.email}`)} style={{ flex: 1 }}>
                  <Text style={styles.contactText} numberOfLines={1}>{d.email ?? '—'}</Text>
                </TouchableOpacity>
                {d.emailVerified && <Feather name="check-circle" size={14} color={colors.success} />}
                {canVerify && (
                  <Switch value={d.emailVerified} onValueChange={() => toggleVerify('EMAIL', d.emailVerified)} disabled={verifyMut.isPending} />
                )}
              </View>
              {/* Phone */}
              <View style={styles.contactRow}>
                <Feather name="phone" size={15} color={colors.textMid} />
                <TouchableOpacity disabled={!d.phone} onPress={() => d.phone && Linking.openURL(`tel:${d.phone}`)} style={{ flex: 1 }}>
                  <Text style={styles.contactText} numberOfLines={1}>{d.phone ?? '—'}</Text>
                </TouchableOpacity>
                {d.phoneVerified && <Feather name="check-circle" size={14} color={colors.success} />}
                {canVerify && (
                  <Switch value={d.phoneVerified} onValueChange={() => toggleVerify('PHONE', d.phoneVerified)} disabled={verifyMut.isPending} />
                )}
              </View>

              {d.riskLevel !== 'NONE' && (
                <View style={styles.riskRow}>
                  <View style={styles.riskDot} />
                  <Text style={styles.riskText}>{d.riskLevel} risk{d.riskReason ? ` · ${d.riskReason}` : ''}</Text>
                </View>
              )}
              {d.suspension?.reason ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>Suspended</Text>
                  <Text style={styles.noteText}>{d.suspension.reason}{d.suspension.until ? ` (until ${d.suspension.until})` : ''}</Text>
                </View>
              ) : null}
            </View>

            {/* Stat tiles */}
            <View style={styles.tileGrid}>
              <Tile label="Bookings" value={d.stats.bookingCount} />
              <Tile label="Spend" value={`₹${d.stats.totalSpend.toLocaleString('en-IN')}`} />
              <Tile label="Refunds" value={`${d.stats.refundCount} · ₹${d.stats.refundTotal.toLocaleString('en-IN')}`} />
              <Tile label="Reviews" value={d.stats.reviewCount} />
              <Tile label="Cancel rate" value={`${d.stats.cancellationRatePct}%`} />
              <Tile label="No-shows" value={d.stats.noShowCount} accent={d.stats.noShowCount > 0 ? colors.danger : undefined} />
            </View>

            {/* Sub-list tabs */}
            <View style={styles.subTabs}>
              {(['bookings', 'payments', 'audit'] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.subTab, tab === t && styles.subTabActive]}>
                  <Text style={[styles.subTabText, tab === t && styles.subTabTextActive]}>
                    {t === 'bookings' ? 'Bookings' : t === 'payments' ? 'Payments' : 'Audit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {tab === 'bookings' && <BookingsSection id={playerId} />}
            {tab === 'payments' && <PaymentsSection id={playerId} />}
            {tab === 'audit' && <AuditSection id={playerId} />}
          </ScrollView>

          {/* Action bar */}
          {orderedBar.length > 0 && (
            <View style={styles.actionBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {orderedBar.map((a) => (
                  <AppButton key={a} label={BAR_ACTIONS[a].label} variant={BAR_ACTIONS[a].variant}
                    disabled={busy} onPress={() => onBarAction(a)} />
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* Reason sheet (suspend / ban) */}
      <Modal visible={reasonFor !== null} transparent animationType="fade" onRequestClose={() => setReasonFor(null)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, shadow.modal]}>
            <Text style={styles.sheetTitle}>{reasonFor === 'BAN' ? 'Ban player' : 'Suspend player'}</Text>
            <Text style={styles.sheetSub}>
              {reasonFor === 'BAN'
                ? 'The player is locked out and cannot re-register with the same email/phone.'
                : 'A temporary cool-down. The player cannot log in until reactivated.'}
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason (required)"
              placeholderTextColor={colors.textDim}
              value={reason}
              onChangeText={setReason}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setReasonFor(null)} />
              <AppButton
                label={reasonFor === 'BAN' ? 'Ban' : 'Suspend'}
                variant="danger"
                style={{ flex: 1 }}
                disabled={!reason.trim() || busy}
                onPress={() => {
                  const action = reasonFor;
                  setReasonFor(null);
                  if (action === 'BAN') banMut.mutate({ id: numId, body: { reason: reason.trim() } }, { onSuccess: () => ok('Player banned.'), onError: (e) => err(e, 'Failed') });
                  else suspendMut.mutate({ id: numId, body: { reason: reason.trim() } }, { onSuccess: () => ok('Player suspended.'), onError: (e) => err(e, 'Failed') });
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Message composer */}
      <MessageComposer
        visible={composing}
        busy={messageMut.isPending}
        onClose={() => setComposing(false)}
        onSend={(channels, subject, body) => {
          setComposing(false);
          messageMut.mutate({ id: numId, body: { channels, subject, body } }, {
            onSuccess: () => ok('Message sent.'), onError: (e) => err(e, 'Failed'),
          });
        }}
      />

      {/* Confirm sheet (reactivate/unban/force-logout/reset) */}
      <ConfirmActionModal
        visible={confirmFor !== null && confirmFor !== 'SUSPEND' && confirmFor !== 'BAN' && confirmFor !== 'MESSAGE'}
        title={confirmFor ? `${BAR_ACTIONS[confirmFor]?.label}?` : ''}
        message={confirmMessage(confirmFor)}
        confirmLabel={confirmFor ? BAR_ACTIONS[confirmFor]?.label : 'Confirm'}
        onConfirm={() => confirmFor && runConfirm(confirmFor)}
        onDismiss={() => setConfirmFor(null)}
      />
    </SafeAreaView>
  );
}

function confirmMessage(a: PlayerActionCode | null): string {
  switch (a) {
    case 'REACTIVATE': return 'Restore this player to active so they can log in and book again?';
    case 'UNBAN': return 'Lift the ban and restore this player to active?';
    case 'FORCE_LOGOUT': return 'Sign this player out of all devices immediately?';
    case 'RESET_PASSWORD': return 'Send this player a password-reset link/OTP? You will never see their password.';
    default: return '';
  }
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, accent ? { color: accent } : null]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function BookingsSection({ id }: { id: string }) {
  const q = usePlayerBookings(id);
  const rows = (q.data?.pages ?? []).flatMap((p: any) => p.rows);
  if (q.isLoading) return <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.md }} />;
  if (rows.length === 0) return <Text style={styles.emptyMini}>No bookings.</Text>;
  return (
    <View>
      {rows.map((b: any) => (
        <View key={b.bookingId} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle} numberOfLines={1}>{b.venueName}</Text>
            <Text style={styles.listSub}>{b.date ?? '—'} · {b.slotLabel}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.listAmount}>₹{b.amount.toLocaleString('en-IN')}</Text>
            <Text style={styles.listStatus}>{b.status}</Text>
          </View>
        </View>
      ))}
      <LoadMore q={q} />
    </View>
  );
}

function PaymentsSection({ id }: { id: string }) {
  const q = usePlayerPayments(id);
  const rows = (q.data?.pages ?? []).flatMap((p: any) => p.rows);
  if (q.isLoading) return <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.md }} />;
  if (rows.length === 0) return <Text style={styles.emptyMini}>No payments.</Text>;
  return (
    <View>
      {rows.map((p: any) => (
        <View key={p.paymentId} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>{p.methodLabel}</Text>
            <Text style={styles.listSub}>{p.date ? formatRelativeTime(p.date) : '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.listAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
            <Text style={styles.listStatus}>{p.status}{p.refundedAmount ? ` · ₹${p.refundedAmount} refunded` : ''}</Text>
          </View>
        </View>
      ))}
      <LoadMore q={q} />
    </View>
  );
}

function AuditSection({ id }: { id: string }) {
  const q = usePlayerAudit(id);
  const rows = (q.data?.pages ?? []).flatMap((p: any) => p.rows);
  if (q.isLoading) return <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.md }} />;
  if (rows.length === 0) return <Text style={styles.emptyMini}>No admin actions yet.</Text>;
  return (
    <View>
      {rows.map((a: any) => (
        <View key={a.id} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>{a.action}{a.toStatus ? ` → ${a.toStatus}` : ''}</Text>
            <Text style={styles.listSub} numberOfLines={1}>
              {a.actorName ?? 'System'}{a.reason ? ` · ${a.reason}` : ''}
            </Text>
          </View>
          <Text style={styles.listSub}>{a.createdAt ? formatRelativeTime(a.createdAt) : ''}</Text>
        </View>
      ))}
      <LoadMore q={q} />
    </View>
  );
}

function LoadMore({ q }: { q: any }) {
  if (!q.hasNextPage) return null;
  return (
    <TouchableOpacity style={styles.loadMore} onPress={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
      <Text style={styles.loadMoreText}>{q.isFetchingNextPage ? 'Loading…' : 'Load more'}</Text>
    </TouchableOpacity>
  );
}

function MessageComposer({ visible, busy, onClose, onSend }: {
  visible: boolean; busy: boolean; onClose: () => void;
  onSend: (channels: string[], subject: string | undefined, body: string) => void;
}) {
  const [channels, setChannels] = useState<string[]>(['IN_APP']);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const toggle = (c: string) => setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <Text style={styles.sheetTitle}>Message player</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            {(['IN_APP', 'EMAIL', 'SMS'] as const).map((c) => (
              <TouchableOpacity key={c} onPress={() => toggle(c)}
                style={[styles.chanChip, channels.includes(c) && styles.chanChipOn]}>
                <Text style={[styles.chanChipText, channels.includes(c) && { color: colors.white }]}>
                  {c === 'IN_APP' ? 'In-app' : c === 'EMAIL' ? 'Email' : 'SMS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.subjInput} placeholder="Subject (optional)" placeholderTextColor={colors.textDim} value={subject} onChangeText={setSubject} />
          <TextInput style={styles.reasonInput} placeholder="Message" placeholderTextColor={colors.textDim} value={body} onChangeText={setBody} multiline />
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
            <AppButton label="Send" variant="primary" style={{ flex: 1 }}
              disabled={busy || !body.trim() || channels.length === 0}
              onPress={() => onSend(channels, subject.trim() || undefined, body.trim())} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  deletedBanner: { backgroundColor: '#FDECEC', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  deletedText: { fontSize: fontSize.sm, color: colors.danger },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  identityTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  muted: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  contactText: { fontSize: fontSize.sm, color: colors.text },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  riskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  riskText: { fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.semibold },
  noteBox: { marginTop: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
  noteLabel: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold },
  noteText: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  tile: { width: '31.5%', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  tileValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  tileLabel: { fontSize: 10, color: colors.textMid, marginTop: 2, textAlign: 'center' },
  subTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  subTab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  subTabActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  subTabText: { fontSize: fontSize.sm, color: colors.textMid },
  subTabTextActive: { color: colors.white, fontWeight: fontWeight.bold },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  listTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  listSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  listAmount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  listStatus: { fontSize: 10, color: colors.textMid, marginTop: 2 },
  emptyMini: { fontSize: fontSize.sm, color: colors.textDim, textAlign: 'center', paddingVertical: spacing.lg },
  loadMore: { alignItems: 'center', paddingVertical: spacing.sm },
  loadMoreText: { fontSize: fontSize.sm, color: colors.admin, fontWeight: fontWeight.semibold },
  actionBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs, marginBottom: spacing.md },
  reasonInput: { minHeight: 80, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text, textAlignVertical: 'top', outlineWidth: 0 } as any,
  subjInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text, marginBottom: spacing.sm, outlineWidth: 0 } as any,
  chanChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chanChipOn: { backgroundColor: colors.admin, borderColor: colors.admin },
  chanChipText: { fontSize: fontSize.sm, color: colors.textMid },
});
