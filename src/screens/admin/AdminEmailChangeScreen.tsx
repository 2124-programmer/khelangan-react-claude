import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, EmptyState } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { toast } from '../../toast';
import { extractApiError } from '../../api/client';
import {
  useAdminEmailChangeList, useAdminApproveEmailChange, useAdminRejectEmailChange,
} from '../../api/hooks/useEmailChange';
import type { EmailChangeRequestDto } from '../../api/types';

export default function AdminEmailChangeScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminEmailChangeList('PENDING');
  const approve = useAdminApproveEmailChange();
  const reject = useAdminRejectEmailChange();
  const [refreshing, setRefreshing] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<EmailChangeRequestDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  const handleApprove = async (item: EmailChangeRequestDto) => {
    try {
      await approve.mutateAsync(String(item.id));
      toast.success(`Email change approved for ${item.currentEmail}.`);
    } catch (err) {
      toast.error(extractApiError(err) || 'Approval failed.');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await reject.mutateAsync({ id: String(rejectTarget.id), data: { reason: rejectReason.trim() || undefined } });
      toast.success('Request rejected.');
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      toast.error(extractApiError(err) || 'Rejection failed.');
    }
  };

  const requests = data?.content ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Email Change Requests" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.admin]} tintColor={colors.admin} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={colors.admin} style={{ marginTop: spacing.xl }} />
        ) : requests.length === 0 ? (
          <EmptyState icon="✉️" title="No pending requests" subtitle="Email change requests awaiting review will appear here." />
        ) : (
          requests.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item)}
              onReject={() => { setRejectTarget(item); setRejectReason(''); }}
              approving={approve.isPending}
            />
          ))
        )}
      </ScrollView>

      {/* Reject reason modal */}
      <ConfirmActionModal
        visible={!!rejectTarget}
        title="Reject Email Change"
        message={`Reject request to change ${rejectTarget?.currentEmail} → ${rejectTarget?.newEmail}?`}
        confirmLabel="Reject"
        danger
        onConfirm={handleReject}
        onDismiss={() => { setRejectTarget(null); setRejectReason(''); }}
        extraContent={
          <TextInput
            style={styles.reasonInput}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.textDim}
            value={rejectReason}
            onChangeText={setRejectReason}
            multiline
          />
        }
      />
    </SafeAreaView>
  );
}

function RequestCard({
  item, onApprove, onReject, approving,
}: {
  item: EmailChangeRequestDto;
  onApprove: () => void;
  onReject: () => void;
  approving: boolean;
}) {
  const createdAt = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—';
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.cardRow}>
        <Text style={styles.label}>User ID</Text>
        <Text style={styles.value}>#{item.userId}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>Current email</Text>
        <Text style={styles.value}>{item.currentEmail}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>New email</Text>
        <Text style={[styles.value, { color: colors.primary }]}>{item.newEmail}</Text>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>Requested</Text>
        <Text style={styles.value}>{createdAt}</Text>
      </View>
      <View style={styles.actions}>
        <AppButton
          label="Approve"
          onPress={onApprove}
          loading={approving}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Reject"
          variant="danger"
          onPress={onReject}
          style={{ flex: 1, marginLeft: spacing.sm }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.medium },
  value: { fontSize: fontSize.sm, color: colors.text, flex: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.sm,
    minHeight: 60,
    marginTop: spacing.sm,
    backgroundColor: colors.bg,
  },
});
