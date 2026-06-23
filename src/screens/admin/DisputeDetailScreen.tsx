import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader, AppButton, EmptyState } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { formatRelativeTime } from '../../utils/dateUtils';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import {
  useDisputeDetail, useAssignDispute, useMessageDispute, useRequestDisputeInfo,
  useAddDisputeNote, useResolveAdminDispute, useDismissDispute, useReopenDispute,
} from '../../api/hooks/useAdminDisputes';
import { DISPUTE_STATUS_COLOR, PRIORITY_COLOR, CATEGORY_ICON } from './DisputesScreen';
import type {
  DisputeActionCode, ResolutionOutcome, ConsequenceAction, DisputePartyRole, MessageAudience,
} from '../../types';

const BAR_ACTIONS: Record<string, { label: string; variant: 'primary' | 'secondary' | 'danger' }> = {
  ASSIGN: { label: 'Assign to me', variant: 'primary' },
  MESSAGE: { label: 'Message', variant: 'secondary' },
  REQUEST_INFO: { label: 'Request info', variant: 'secondary' },
  ADD_NOTE: { label: 'Add note', variant: 'secondary' },
  RESOLVE: { label: 'Resolve', variant: 'primary' },
  DISMISS: { label: 'Dismiss', variant: 'danger' },
  REOPEN: { label: 'Reopen', variant: 'primary' },
};
const BAR_ORDER: DisputeActionCode[] = ['RESOLVE', 'ASSIGN', 'MESSAGE', 'REQUEST_INFO', 'ADD_NOTE', 'DISMISS', 'REOPEN'];

const OUTCOMES: { label: string; value: ResolutionOutcome }[] = [
  { label: 'For player', value: 'RULED_FOR_PLAYER' },
  { label: 'For owner', value: 'RULED_FOR_OWNER' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Settled by parties', value: 'RESOLVED_BY_PARTIES' },
];
const CONSEQUENCES: ConsequenceAction[] = ['WARN', 'FLAG', 'SUSPEND', 'BAN'];

export default function DisputeDetailScreen({ navigation, route }: any) {
  const disputeId: string = String(route?.params?.disputeId ?? '');
  const numId = Number(disputeId);
  const detailQ = useDisputeDetail(disputeId);

  const assignMut = useAssignDispute();
  const messageMut = useMessageDispute();
  const requestInfoMut = useRequestDisputeInfo();
  const noteMut = useAddDisputeNote();
  const resolveMut = useResolveAdminDispute();
  const dismissMut = useDismissDispute();
  const reopenMut = useReopenDispute();

  const [sheet, setSheet] = useState<null | 'MESSAGE' | 'REQUEST_INFO' | 'ADD_NOTE' | 'RESOLVE' | 'DISMISS' | 'REOPEN'>(null);
  const [confirmAssign, setConfirmAssign] = useState(false);

  const d = detailQ.data;
  const busy = assignMut.isPending || messageMut.isPending || requestInfoMut.isPending || noteMut.isPending
    || resolveMut.isPending || dismissMut.isPending || reopenMut.isPending;

  const ok = (msg: string) => toast.success(msg);
  const err = (e: unknown, m: string) => toast.error(extractApiError(e) || m);

  const onBar = (a: DisputeActionCode) => {
    if (a === 'ASSIGN') setConfirmAssign(true);
    else setSheet(a as any);
  };

  const orderedBar = BAR_ORDER.filter((a) => (d?.availableActions ?? []).includes(a) && BAR_ACTIONS[a]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={d?.title ?? 'Dispute'} onBack={() => navigation.goBack()} />

      {detailQ.isLoading ? (
        <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
      ) : !d ? (
        <EmptyState icon="⚠️" title="Could not load" subtitle="Try again in a moment." />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
            {d.isOverdue && (
              <View style={styles.overdueBanner}>
                <Text style={styles.overdueBannerText}>⏰ Overdue — past the {d.slaHours}h SLA.</Text>
              </View>
            )}

            {/* Header */}
            <View style={[styles.card, shadow.card]}>
              <View style={styles.headRow}>
                <Text style={styles.catIcon}>{CATEGORY_ICON[d.category]}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{d.title}</Text>
                  <View style={styles.chipsRow}>
                    <View style={[styles.badge, { backgroundColor: DISPUTE_STATUS_COLOR[d.status] }]}>
                      <Text style={styles.badgeText}>{d.status.replace('_', ' ')}</Text>
                    </View>
                    <View style={[styles.priChip, { backgroundColor: PRIORITY_COLOR[d.priority] }]}>
                      <Text style={styles.priChipText}>{d.priority}</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.muted}>
                Raised by {d.raisedByRole.toLowerCase()} {d.raisedAt ? formatRelativeTime(d.raisedAt) : ''}
                {' · '}{d.assignedToName ? `Assigned to ${d.assignedToName}` : 'Unassigned'}
                {d.waitingOn !== 'NONE' ? ` · Waiting on ${d.waitingOn.toLowerCase()}` : ''}
              </Text>
            </View>

            {/* Booking anchor */}
            {d.booking && (
              <TouchableOpacity style={[styles.card, shadow.card]} activeOpacity={0.85}
                onPress={() => navigation.navigate('AdminBookings')}>
                <Text style={styles.sectionLabel}>Booking {d.booking.ref}</Text>
                <Text style={styles.bookingLine}>{d.booking.venueName}</Text>
                <Text style={styles.muted}>
                  {d.booking.date ?? '—'} · {d.booking.slotLabel} · ₹{d.booking.amount.toLocaleString('en-IN')}
                  {d.booking.methodLabel ? ` · ${d.booking.methodLabel}` : ''} · {d.booking.status}
                </Text>
              </TouchableOpacity>
            )}

            {/* Parties */}
            <View style={styles.partyRow}>
              <PartyCard label="Player" mini={d.player}
                onPress={() => navigation.navigate('PlayerDetail', { playerId: d.player.id })} />
              <PartyCard label="Owner" mini={d.owner}
                onPress={() => navigation.navigate('OwnerDetail', { ownerId: d.owner.id })} />
            </View>

            {/* Conversation (party-visible) */}
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.sectionLabel}>Conversation</Text>
              <Text style={styles.visHint}>Visible to player & owner</Text>
              {d.conversation.length === 0 ? <Text style={styles.emptyMini}>No messages.</Text>
                : d.conversation.map((m) => (
                  <View key={m.id} style={styles.msg}>
                    <Text style={styles.msgHead}>
                      {m.senderName} <Text style={styles.msgRole}>· {m.senderRole}</Text>
                      {m.createdAt ? <Text style={styles.msgTime}>  {formatRelativeTime(m.createdAt)}</Text> : null}
                    </Text>
                    <Text style={styles.msgBody}>{m.body}</Text>
                    {m.attachments.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xs }}>
                        {m.attachments.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.attachment} />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                ))}
            </View>

            {/* Internal notes (admin only) */}
            <View style={[styles.card, styles.notesCard]}>
              <Text style={styles.sectionLabel}>Internal notes</Text>
              <Text style={styles.adminOnlyHint}>🔒 Admin only — never shown to parties</Text>
              {d.internalNotes.length === 0 ? <Text style={styles.emptyMini}>No internal notes.</Text>
                : d.internalNotes.map((n) => (
                  <View key={n.id} style={styles.msg}>
                    <Text style={styles.msgHead}>{n.authorName}
                      {n.createdAt ? <Text style={styles.msgTime}>  {formatRelativeTime(n.createdAt)}</Text> : null}
                    </Text>
                    <Text style={styles.msgBody}>{n.body}</Text>
                  </View>
                ))}
            </View>

            {/* Resolution panel */}
            {d.resolution && (
              <View style={[styles.card, shadow.card]}>
                <Text style={styles.sectionLabel}>Resolution</Text>
                <Text style={styles.resLine}>Outcome: {(d.resolution.outcome ?? 'DISMISSED').replace(/_/g, ' ')}</Text>
                <Text style={styles.resLine}>At fault: {d.resolution.atFault}</Text>
                {d.resolution.rulingNote ? <Text style={styles.muted}>{d.resolution.rulingNote}</Text> : null}
                {d.resolution.recommendedRefundAmount ? (
                  <View style={styles.refundBox}>
                    <Text style={styles.refundText}>
                      Owner asked to refund ₹{d.resolution.recommendedRefundAmount.toLocaleString('en-IN')} directly —
                      the platform does not process this.
                    </Text>
                  </View>
                ) : null}
                {d.resolution.consequenceAction && d.resolution.consequenceAction !== 'NONE' ? (
                  <Text style={styles.resLine}>
                    Consequence: {d.resolution.consequenceAction} on {d.resolution.consequenceTarget}
                  </Text>
                ) : null}
                {d.resolution.resolvedByName ? (
                  <Text style={styles.muted}>By {d.resolution.resolvedByName}
                    {d.resolution.resolvedAt ? ` · ${formatRelativeTime(d.resolution.resolvedAt)}` : ''}</Text>
                ) : null}
              </View>
            )}

            {/* Timeline */}
            <View style={[styles.card, shadow.card]}>
              <Text style={styles.sectionLabel}>Timeline</Text>
              {d.timeline.length === 0 ? <Text style={styles.emptyMini}>No activity yet.</Text>
                : d.timeline.map((t) => (
                  <View key={t.id} style={styles.tlRow}>
                    <View style={styles.tlDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tlSummary}>{t.summary}</Text>
                      <Text style={styles.msgTime}>{t.actorName}{t.createdAt ? ` · ${formatRelativeTime(t.createdAt)}` : ''}</Text>
                    </View>
                  </View>
                ))}
            </View>
          </ScrollView>

          {/* Action bar */}
          {orderedBar.length > 0 && (
            <View style={styles.actionBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {orderedBar.map((a) => (
                  <AppButton key={a} label={BAR_ACTIONS[a].label} variant={BAR_ACTIONS[a].variant}
                    disabled={busy} onPress={() => onBar(a)} />
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <ConfirmActionModal
        visible={confirmAssign}
        title="Assign to me?"
        message="Take ownership of this dispute and move it to Under review."
        confirmLabel="Assign"
        onConfirm={() => {
          setConfirmAssign(false);
          assignMut.mutate({ id: numId, adminId: null }, { onSuccess: () => ok('Assigned to you.'), onError: (e) => err(e, 'Failed') });
        }}
        onDismiss={() => setConfirmAssign(false)}
      />

      <MessageSheet visible={sheet === 'MESSAGE'} busy={messageMut.isPending} onClose={() => setSheet(null)}
        onSend={(audience, channels, body) => {
          setSheet(null);
          messageMut.mutate({ id: numId, body: { audience, channels, body } },
            { onSuccess: () => ok('Message sent.'), onError: (e) => err(e, 'Failed') });
        }} />

      <RequestInfoSheet visible={sheet === 'REQUEST_INFO'} busy={requestInfoMut.isPending} onClose={() => setSheet(null)}
        onSend={(party, message) => {
          setSheet(null);
          requestInfoMut.mutate({ id: numId, body: { party, message } },
            { onSuccess: () => ok('Info requested.'), onError: (e) => err(e, 'Failed') });
        }} />

      <TextSheet visible={sheet === 'ADD_NOTE'} title="Internal note" subtitle="Admin only — never shown to the parties."
        placeholder="Note" confirmLabel="Save note" busy={noteMut.isPending} onClose={() => setSheet(null)}
        onSubmit={(body) => {
          setSheet(null);
          noteMut.mutate({ id: numId, body: { body } }, { onSuccess: () => ok('Note added.'), onError: (e) => err(e, 'Failed') });
        }} />

      <TextSheet visible={sheet === 'DISMISS'} title="Dismiss dispute" subtitle="Invalid, duplicate or spam."
        placeholder="Reason (required)" confirmLabel="Dismiss" danger busy={dismissMut.isPending} onClose={() => setSheet(null)}
        onSubmit={(reason) => {
          setSheet(null);
          dismissMut.mutate({ id: numId, body: { reason } }, { onSuccess: () => ok('Dispute dismissed.'), onError: (e) => err(e, 'Failed') });
        }} />

      <TextSheet visible={sheet === 'REOPEN'} title="Reopen dispute" subtitle="Move back to Under review."
        placeholder="Reason (required)" confirmLabel="Reopen" busy={reopenMut.isPending} onClose={() => setSheet(null)}
        onSubmit={(reason) => {
          setSheet(null);
          reopenMut.mutate({ id: numId, body: { reason } }, { onSuccess: () => ok('Dispute reopened.'), onError: (e) => err(e, 'Failed') });
        }} />

      <ResolveSheet visible={sheet === 'RESOLVE'} busy={resolveMut.isPending} onClose={() => setSheet(null)}
        onSubmit={(body) => {
          setSheet(null);
          resolveMut.mutate({ id: numId, body }, { onSuccess: () => ok('Dispute resolved.'), onError: (e) => err(e, 'Failed') });
        }} />
    </SafeAreaView>
  );
}

function PartyCard({ label, mini, onPress }: { label: string; mini: any; onPress: () => void }) {
  const flagged = mini.riskLevel === 'MEDIUM' || mini.riskLevel === 'HIGH';
  return (
    <TouchableOpacity style={[styles.partyCard, shadow.card]} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.partyLabel}>{label}</Text>
      <View style={styles.partyNameRow}>
        <Text style={styles.partyName} numberOfLines={1}>{mini.name}</Text>
        {mini.phoneVerified && <Feather name="check-circle" size={12} color={colors.success} />}
        {flagged && <View style={styles.riskDot} />}
      </View>
      <Text style={styles.muted}>
        {mini.priorDisputeCount} prior dispute{mini.priorDisputeCount === 1 ? '' : 's'}
        {mini.rating != null ? ` · ★${Number(mini.rating).toFixed(1)}` : ''}
      </Text>
      {mini.riskLevel !== 'NONE' && <Text style={styles.riskText}>{mini.riskLevel} risk</Text>}
    </TouchableOpacity>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.selChip, on && styles.selChipOn]}>
      <Text style={[styles.selChipText, on && { color: colors.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MessageSheet({ visible, busy, onClose, onSend }: {
  visible: boolean; busy: boolean; onClose: () => void;
  onSend: (audience: MessageAudience, channels: string[], body: string) => void;
}) {
  const [audience, setAudience] = useState<MessageAudience>('BOTH');
  const [channels, setChannels] = useState<string[]>(['IN_APP']);
  const [body, setBody] = useState('');
  const toggleCh = (c: string) => setChannels((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);
  return (
    <Sheet visible={visible} title="Message parties" onClose={onClose}>
      <Text style={styles.fieldLabel}>Audience</Text>
      <View style={styles.chipWrap}>
        {(['PLAYER', 'OWNER', 'BOTH'] as MessageAudience[]).map((a) => (
          <Chip key={a} label={a === 'BOTH' ? 'Both' : a[0] + a.slice(1).toLowerCase()} on={audience === a} onPress={() => setAudience(a)} />
        ))}
      </View>
      <Text style={styles.fieldLabel}>Channels</Text>
      <View style={styles.chipWrap}>
        {(['IN_APP', 'EMAIL', 'SMS']).map((c) => (
          <Chip key={c} label={c === 'IN_APP' ? 'In-app' : c[0] + c.slice(1).toLowerCase()} on={channels.includes(c)} onPress={() => toggleCh(c)} />
        ))}
      </View>
      <TextInput style={styles.reasonInput} placeholder="Message" placeholderTextColor={colors.textDim}
        value={body} onChangeText={setBody} multiline />
      <SheetButtons confirmLabel="Send" disabled={busy || !body.trim() || channels.length === 0} onCancel={onClose}
        onConfirm={() => onSend(audience, channels, body.trim())} />
    </Sheet>
  );
}

function RequestInfoSheet({ visible, busy, onClose, onSend }: {
  visible: boolean; busy: boolean; onClose: () => void;
  onSend: (party: DisputePartyRole, message: string) => void;
}) {
  const [party, setParty] = useState<DisputePartyRole>('PLAYER');
  const [message, setMessage] = useState('');
  return (
    <Sheet visible={visible} title="Request info" onClose={onClose}>
      <Text style={styles.fieldLabel}>From</Text>
      <View style={styles.chipWrap}>
        {(['PLAYER', 'OWNER'] as DisputePartyRole[]).map((p) => (
          <Chip key={p} label={p[0] + p.slice(1).toLowerCase()} on={party === p} onPress={() => setParty(p)} />
        ))}
      </View>
      <TextInput style={styles.reasonInput} placeholder="What do you need from them?" placeholderTextColor={colors.textDim}
        value={message} onChangeText={setMessage} multiline />
      <SheetButtons confirmLabel="Request" disabled={busy || !message.trim()} onCancel={onClose}
        onConfirm={() => onSend(party, message.trim())} />
    </Sheet>
  );
}

function TextSheet({ visible, title, subtitle, placeholder, confirmLabel, danger, busy, onClose, onSubmit }: {
  visible: boolean; title: string; subtitle?: string; placeholder: string; confirmLabel: string;
  danger?: boolean; busy: boolean; onClose: () => void; onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState('');
  React.useEffect(() => { if (visible) setText(''); }, [visible]);
  return (
    <Sheet visible={visible} title={title} subtitle={subtitle} onClose={onClose}>
      <TextInput style={styles.reasonInput} placeholder={placeholder} placeholderTextColor={colors.textDim}
        value={text} onChangeText={setText} multiline autoFocus />
      <SheetButtons confirmLabel={confirmLabel} danger={danger} disabled={busy || !text.trim()} onCancel={onClose}
        onConfirm={() => onSubmit(text.trim())} />
    </Sheet>
  );
}

function ResolveSheet({ visible, busy, onClose, onSubmit }: {
  visible: boolean; busy: boolean; onClose: () => void; onSubmit: (body: any) => void;
}) {
  const [outcome, setOutcome] = useState<ResolutionOutcome>('RULED_FOR_PLAYER');
  const [atFault, setAtFault] = useState<DisputePartyRole | 'NONE'>('OWNER');
  const [ruling, setRuling] = useState('');
  const [refund, setRefund] = useState('');
  const [conseqOn, setConseqOn] = useState(false);
  const [target, setTarget] = useState<DisputePartyRole>('OWNER');
  const [action, setAction] = useState<ConsequenceAction>('WARN');
  const [conseqReason, setConseqReason] = useState('');

  React.useEffect(() => {
    if (visible) { setOutcome('RULED_FOR_PLAYER'); setAtFault('OWNER'); setRuling(''); setRefund(''); setConseqOn(false); setAction('WARN'); setConseqReason(''); }
  }, [visible]);

  const submit = () => {
    const amount = refund.trim() ? parseInt(refund.trim(), 10) : null;
    const body: any = {
      outcome, atFault, rulingNote: ruling.trim(),
      recommendedRefundAmount: amount && !isNaN(amount) ? amount : null,
      consequence: conseqOn && action !== 'NONE'
        ? { target, action, reason: conseqReason.trim() } : null,
    };
    onSubmit(body);
  };
  const valid = !!ruling.trim() && (!conseqOn || !!conseqReason.trim());

  return (
    <Sheet visible={visible} title="Resolve dispute" onClose={onClose}>
      <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.fieldLabel}>Outcome</Text>
        <View style={styles.chipWrap}>
          {OUTCOMES.map((o) => <Chip key={o.value} label={o.label} on={outcome === o.value} onPress={() => setOutcome(o.value)} />)}
        </View>
        <Text style={styles.fieldLabel}>At fault</Text>
        <View style={styles.chipWrap}>
          {(['PLAYER', 'OWNER', 'NONE'] as const).map((f) =>
            <Chip key={f} label={f[0] + f.slice(1).toLowerCase()} on={atFault === f} onPress={() => setAtFault(f)} />)}
        </View>
        <TextInput style={styles.reasonInput} placeholder="Ruling note (required)" placeholderTextColor={colors.textDim}
          value={ruling} onChangeText={setRuling} multiline />

        <Text style={styles.fieldLabel}>Recommended refund (optional)</Text>
        <TextInput style={styles.subjInput} placeholder="₹ amount" placeholderTextColor={colors.textDim}
          value={refund} onChangeText={setRefund} keyboardType="number-pad" />
        {refund.trim() ? (
          <Text style={styles.refundHint}>
            Owner will be asked to refund ₹{refund.trim()} directly — the platform does not process this.
          </Text>
        ) : null}

        <TouchableOpacity style={styles.toggleRow} onPress={() => setConseqOn((v) => !v)}>
          <Text style={styles.fieldLabel}>Apply a consequence</Text>
          <Feather name={conseqOn ? 'check-square' : 'square'} size={20} color={colors.admin} />
        </TouchableOpacity>
        {conseqOn && (
          <>
            <View style={styles.chipWrap}>
              {(['PLAYER', 'OWNER'] as DisputePartyRole[]).map((t) =>
                <Chip key={t} label={`On ${t.toLowerCase()}`} on={target === t} onPress={() => setTarget(t)} />)}
            </View>
            <View style={styles.chipWrap}>
              {CONSEQUENCES.map((a) => <Chip key={a} label={a[0] + a.slice(1).toLowerCase()} on={action === a} onPress={() => setAction(a)} />)}
            </View>
            <TextInput style={styles.subjInput} placeholder="Consequence reason (required)" placeholderTextColor={colors.textDim}
              value={conseqReason} onChangeText={setConseqReason} />
          </>
        )}
      </ScrollView>
      <SheetButtons confirmLabel="Resolve" disabled={busy || !valid} onCancel={onClose} onConfirm={submit} />
    </Sheet>
  );
}

function Sheet({ visible, title, subtitle, onClose, children }: {
  visible: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function SheetButtons({ confirmLabel, danger, disabled, onCancel, onConfirm }: {
  confirmLabel: string; danger?: boolean; disabled: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
      <AppButton label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={onCancel} />
      <AppButton label={confirmLabel} variant={danger ? 'danger' : 'primary'} style={{ flex: 1 }}
        disabled={disabled} onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  overdueBanner: { backgroundColor: '#FDECEC', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  overdueBannerText: { fontSize: fontSize.sm, color: colors.danger, fontWeight: fontWeight.semibold },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  notesCard: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#F0E0A0' },
  headRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  catIcon: { fontSize: 26 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  muted: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  sectionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text, marginBottom: 2 },
  bookingLine: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 2 },
  visHint: { fontSize: 10, color: colors.textDim, marginBottom: spacing.sm },
  adminOnlyHint: { fontSize: 10, color: '#9A7B00', marginBottom: spacing.sm, fontWeight: fontWeight.semibold },
  partyRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  partyCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  partyLabel: { fontSize: 10, color: colors.textDim, fontWeight: fontWeight.semibold, textTransform: 'uppercase' },
  partyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  partyName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  riskDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  riskText: { fontSize: fontSize.xs, color: colors.danger, fontWeight: fontWeight.semibold, marginTop: 2 },
  msg: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm },
  msgHead: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.semibold },
  msgRole: { color: colors.textDim, fontWeight: fontWeight.regular },
  msgTime: { color: colors.textDim, fontWeight: fontWeight.regular, fontSize: 10 },
  msgBody: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  attachment: { width: 72, height: 72, borderRadius: radius.sm, marginRight: spacing.sm, backgroundColor: colors.surfaceAlt },
  resLine: { fontSize: fontSize.sm, color: colors.text, marginTop: 2 },
  refundBox: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  refundText: { fontSize: fontSize.xs, color: colors.textMid },
  tlRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'flex-start' },
  tlDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.admin, marginTop: 5 },
  tlSummary: { fontSize: fontSize.sm, color: colors.text },
  emptyMini: { fontSize: fontSize.sm, color: colors.textDim, paddingVertical: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.pill },
  badgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  priChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  priChipText: { color: colors.white, fontSize: 10, fontWeight: fontWeight.bold },
  actionBar: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  sheetSub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  fieldLabel: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold, marginTop: spacing.sm, marginBottom: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  selChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  selChipOn: { backgroundColor: colors.admin, borderColor: colors.admin },
  selChipText: { fontSize: fontSize.sm, color: colors.textMid },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  refundHint: { fontSize: 11, color: colors.warning, marginTop: spacing.xs },
  reasonInput: { minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text, textAlignVertical: 'top', marginTop: spacing.sm, outlineWidth: 0 } as any,
  subjInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.md, color: colors.text, marginTop: spacing.xs, outlineWidth: 0 } as any,
});
