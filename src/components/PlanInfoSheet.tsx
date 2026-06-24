import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { usePlanMeta, resolvePlanCode } from '../theme/planMeta';
import { useSubscriptionPlans } from '../api/hooks/useSubscription';
import type { PlanCode } from '../types';

/**
 * Bottom sheet with a plan's details. Name/colour/blurb come from `planMeta`; price, court limit and
 * duration come from the live subscription-plans query (never duplicated in planMeta), so a backend
 * price change reflects here with no client edit.
 */
export function PlanInfoSheet({
  plan,
  visible,
  onClose,
}: {
  plan: PlanCode;
  visible: boolean;
  onClose: () => void;
}) {
  const meta = usePlanMeta(plan);
  const plansQ = useSubscriptionPlans();
  const detail = (plansQ.data ?? []).find((p) => resolvePlanCode(p.code) === plan);

  const isTrial = plan === 'TRIAL';
  const price = isTrial ? 'Free' : detail ? `₹${detail.priceMonthly.toLocaleString('en-IN')}/mo` : '—';
  const courts = detail ? `Up to ${detail.maxCourts} court${detail.maxCourts === 1 ? '' : 's'}` : '—';
  const billing = isTrial
    ? `${detail?.trialDays ?? 30}-day trial`
    : 'Monthly billing';
  const kind = isTrial ? 'Trial' : 'Paid';

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: meta.text }]}>{meta.name} plan</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={20} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          <Text style={styles.blurb}>{meta.blurb}</Text>
          <View style={styles.divider} />

          {plansQ.isLoading && !detail ? (
            <ActivityIndicator color={colors.admin} style={{ marginVertical: spacing.md }} />
          ) : (
            <>
              <Row label="Price" value={price} />
              <Row label="Court limit" value={courts} />
              <Row label="Billing" value={billing} />
              <Row label="Kind" value={kind} />
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rLabel}>{label}</Text>
      <Text style={styles.rValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  blurb: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  rLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rValue: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
});
