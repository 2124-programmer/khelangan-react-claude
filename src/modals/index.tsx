// Reusable modal/popup overlays.
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { AppButton, StarRating } from '../components/common';

/* ───────────────── ConfirmActionModal ───────────────── */
interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}
export function ConfirmActionModal({
  visible, title, message, confirmLabel = 'Confirm', danger, onConfirm, onDismiss,
}: ConfirmProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, shadow.modal]}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMsg}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <AppButton label="Cancel" variant="secondary" onPress={onDismiss} style={{ flex: 1 }} />
            <AppButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────── CancelBookingModal ───────────────── */
interface CancelProps {
  visible: boolean;
  venueName: string;
  refundAmount: number;
  onConfirm: () => void;
  onDismiss: () => void;
}
export function CancelBookingModal({ visible, venueName, refundAmount, onConfirm, onDismiss }: CancelProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.dialogTitle}>Cancel Booking?</Text>
          <Text style={styles.dialogMsg}>You're cancelling your booking at {venueName}.</Text>
          <View style={styles.refundBox}>
            <Text style={styles.refundLabel}>Refund amount</Text>
            <Text style={styles.refundAmount}>₹{refundAmount}</Text>
          </View>
          <Text style={styles.policyNote}>
            ℹ️ Full refund for cancellations 24+ hrs before slot. 50% within 12–24 hrs. No refund under 12 hrs.
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <AppButton label="Confirm Cancellation" variant="danger" onPress={onConfirm} />
            <AppButton label="Keep Booking" variant="secondary" onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────── CouponApplyModal ───────────────── */
interface CouponProps {
  visible: boolean;
  coupons: { code: string; label: string }[];
  onApply: (code: string) => void;
  onDismiss: () => void;
}
export function CouponApplyModal({ visible, coupons, onApply, onDismiss }: CouponProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.dialogTitle}>Available Coupons</Text>
            <TouchableOpacity onPress={onDismiss}><Text style={styles.closeX}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300, marginTop: spacing.md }}>
            {coupons.map((c) => (
              <View key={c.code} style={styles.couponItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponCode}>{c.code}</Text>
                  <Text style={styles.couponLabel}>{c.label}</Text>
                </View>
                <AppButton label="Apply" variant="ghost" fullWidth={false} onPress={() => onApply(c.code)} style={{ height: 38, paddingHorizontal: spacing.lg }} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────── PaymentFailedModal ───────────────── */
export function PaymentFailedModal({ visible, onRetry, onDismiss }: { visible: boolean; onRetry: () => void; onDismiss: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, shadow.modal]}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>❌</Text>
          <Text style={[styles.dialogTitle, { textAlign: 'center' }]}>Payment Failed</Text>
          <Text style={[styles.dialogMsg, { textAlign: 'center' }]}>Your payment could not be processed. Please try again.</Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <AppButton label="Retry Payment" onPress={onRetry} />
            <AppButton label="Cancel" variant="secondary" onPress={onDismiss} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────── SlotLockExpiredModal ───────────────── */
export function SlotLockExpiredModal({ visible, onGoBack }: { visible: boolean; onGoBack: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.dialog, shadow.modal]}>
          <Text style={{ fontSize: 48, textAlign: 'center' }}>⏱️</Text>
          <Text style={[styles.dialogTitle, { textAlign: 'center' }]}>Slot Reservation Expired</Text>
          <Text style={[styles.dialogMsg, { textAlign: 'center' }]}>
            Your 10-minute hold has expired. The slot may have been taken by another user.
          </Text>
          <AppButton label="Back to Slots" onPress={onGoBack} style={{ marginTop: spacing.lg }} />
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────── RatingDetailModal ───────────────── */
export function RatingDetailModal({ visible, rating, breakdown, onDismiss }: {
  visible: boolean; rating: number;
  breakdown: { label: string; value: number }[]; onDismiss: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.dialogTitle}>Rating Breakdown</Text>
          <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
            <Text style={{ fontSize: 48, fontWeight: fontWeight.bold, color: colors.text }}>{rating}</Text>
            <StarRating value={Math.round(rating)} size={20} />
          </View>
          {breakdown.map((b) => (
            <View key={b.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{b.label}</Text>
              <StarRating value={b.value} size={14} />
            </View>
          ))}
          <AppButton label="Close" variant="secondary" onPress={onDismiss} style={{ marginTop: spacing.lg }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  dialogTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm },
  dialogMsg: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.sm, lineHeight: 20 },
  sheetOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  closeX: { fontSize: fontSize.lg, color: colors.textDim },
  refundBox: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  refundLabel: { fontSize: fontSize.sm, color: colors.primaryDark },
  refundAmount: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primaryDark },
  policyNote: { fontSize: fontSize.xs, color: colors.textMid, marginTop: spacing.md, lineHeight: 17 },
  couponItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  couponCode: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  couponLabel: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  breakdownLabel: { fontSize: fontSize.sm, color: colors.textMid },
});
