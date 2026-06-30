import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { ResponsiveGrid, centeredContent } from '../../responsive';
import { AppHeader, AppButton, AppInput, EmptyState, LoadingOverlay } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import {
  useAdminCourtChangeRequests, useApproveCourtChangeRequest, useRejectCourtChangeRequest,
} from '../../api/hooks/useSubscription';
import { extractApiError } from '../../api/client';
import { toast } from '../../toast';
import { formatRelativeTime } from '../../utils/dateUtils';
import type { CourtChangeRequestDto } from '../../api/types';

/**
 * Super-admin queue for owner court-change requests (free/swap an already-LIVE court). Approving
 * applies the coverage change; rejecting needs a reason. The backend gates both to SUPER_ADMIN, so
 * a non-super admin gets a 403 even if they reach this screen.
 */
export default function AdminCourtChangeRequestsScreen({ navigation }: any) {
  const { data: requests = [], isLoading, refetch, isRefetching } = useAdminCourtChangeRequests('PENDING');
  const approve = useApproveCourtChangeRequest();
  const reject = useRejectCourtChangeRequest();

  const [rejectTarget, setRejectTarget] = useState<CourtChangeRequestDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (req: CourtChangeRequestDto) => {
    try {
      const res = await approve.mutateAsync(Number(req.id));
      // Approval may auto-reject when the targeted state changed (stale) — reflect that honestly.
      if (res.status === 'REJECTED') {
        toast.info(res.decisionNote || 'Request could not be applied (state changed).');
      } else {
        toast.success('Court change applied.');
      }
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  const submitReject = async () => {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync({ id: Number(rejectTarget.id), reason: rejectReason.trim() || 'Declined.' });
      toast.success('Request rejected.');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(extractApiError(err));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Court Change Requests" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, ...centeredContent }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.admin]} tintColor={colors.admin} />}
      >
        {isLoading ? (
          <LoadingOverlay visible />
        ) : requests.length === 0 ? (
          <EmptyState icon="✅" title="No pending requests" subtitle="Owner court-change requests will appear here." />
        ) : (
          <ResponsiveGrid>
          {requests.map((req) => {
            const busy = (approve.isPending && approve.variables === Number(req.id))
              || (reject.isPending && reject.variables?.id === Number(req.id));
            return (
              <View key={req.id} style={[styles.card, shadow.card]}>
                <View style={styles.cardHead}>
                  <Text style={styles.venue} numberOfLines={1}>{req.venueName ?? `Venue #${req.venueId}`}</Text>
                  <Text style={styles.time}>{req.createdAt ? formatRelativeTime(req.createdAt) : ''}</Text>
                </View>
                <Text style={styles.owner}>By {req.ownerName ?? 'owner'}</Text>

                <View style={styles.changeRow}>
                  <View style={styles.pill}>
                    <Feather name="lock" size={12} color={colors.danger} />
                    <Text style={styles.pillText}>Free: {req.liveCourtName ?? `#${req.liveCourtId}`}</Text>
                  </View>
                  {req.draftCourtId != null && (
                    <>
                      <Feather name="arrow-right" size={14} color={colors.textDim} />
                      <View style={[styles.pill, styles.pillLive]}>
                        <Feather name="eye" size={12} color={colors.primary} />
                        <Text style={[styles.pillText, { color: colors.primary }]}>Make live: {req.draftCourtName ?? `#${req.draftCourtId}`}</Text>
                      </View>
                    </>
                  )}
                </View>

                {!!req.reason && <Text style={styles.reason}>“{req.reason}”</Text>}

                <View style={styles.actions}>
                  <AppButton
                    label="Reject"
                    variant="secondary"
                    fullWidth={false}
                    disabled={busy}
                    onPress={() => { setRejectTarget(req); setRejectReason(''); }}
                    style={{ flex: 1, height: 40 }}
                  />
                  <AppButton
                    label="Approve"
                    fullWidth={false}
                    loading={busy && approve.isPending}
                    disabled={busy}
                    onPress={() => handleApprove(req)}
                    style={{ flex: 1, height: 40 }}
                  />
                </View>
              </View>
            );
          })}
          </ResponsiveGrid>
        )}
      </ScrollView>

      <ConfirmActionModal
        visible={!!rejectTarget}
        danger
        title="Reject request?"
        message={`Decline the court-change request for "${rejectTarget?.venueName ?? ''}". The owner is notified.`}
        confirmLabel={reject.isPending ? 'Rejecting…' : 'Reject'}
        confirmLoading={reject.isPending}
        onConfirm={submitReject}
        onDismiss={() => { setRejectTarget(null); setRejectReason(''); }}
        extraContent={
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.reqLabel}>Reason (optional)</Text>
            <AppInput value={rejectReason} onChangeText={setRejectReason} placeholder="Why is this declined?" multiline />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  venue: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  time: { fontSize: fontSize.xs, color: colors.textDim, marginLeft: spacing.sm },
  owner: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  pillLive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMid },
  reason: { fontSize: fontSize.sm, color: colors.textMid, fontStyle: 'italic', marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  reqLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginBottom: spacing.xs },
});
