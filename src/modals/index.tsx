// Reusable modal/popup overlays.
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { AppButton, StarRating } from '../components/common';
import { toast } from '../toast';

/* ───────────────── ConfirmActionModal ───────────────── */
interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  extraContent?: React.ReactNode;
}
export function ConfirmActionModal({
  visible, title, message, confirmLabel = 'Confirm', danger, confirmLoading, confirmDisabled,
  onConfirm, onDismiss, extraContent,
}: ConfirmProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, shadow.modal]}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMsg}>{message}</Text>
          {extraContent}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            <AppButton label="Cancel" variant="secondary" onPress={onDismiss} disabled={confirmLoading} style={{ flex: 1 }} />
            <AppButton
              label={confirmLabel}
              variant={danger ? 'danger' : 'primary'}
              loading={confirmLoading}
              disabled={confirmLoading || confirmDisabled}
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
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}
export function CancelBookingModal({ visible, venueName, refundAmount, loading, onConfirm, onDismiss }: CancelProps) {
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
            <AppButton label="Confirm Cancellation" variant="danger" onPress={onConfirm} loading={loading} disabled={loading} />
            <AppButton label="Keep Booking" variant="secondary" onPress={onDismiss} disabled={loading} />
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

/* ───────────────── ContactSheet ───────────────── */
interface ContactSheetProps {
  visible: boolean;
  phone?: string;
  venueName?: string;
  onClose: () => void;
  /**
   * Fired the instant a channel is chosen, before the dialer/WhatsApp launches. Best-effort —
   * the launch happens regardless of what this callback does (e.g. a failing network call).
   * Bookings omit it; the venue-detail screen uses it to notify the owner.
   */
  onContact?: (channel: 'CALL' | 'WHATSAPP') => void;
  /** Overrides the WhatsApp prefill text. Defaults to a booking-oriented message. */
  whatsappMessage?: string;
}
export function ContactSheet({ visible, phone, venueName, onClose, onContact, whatsappMessage }: ContactSheetProps) {
  const cleaned = (phone ?? '').replace(/[\s\-()]/g, '');

  const handleCall = () => {
    onContact?.('CALL');
    // Desktop web has no dialer — show the number to copy/dial instead of a silent no-op.
    if (cleaned && Platform.OS === 'web') {
      toast.info(`Call ${phone}`);
    } else if (cleaned) {
      Linking.openURL(`tel:${cleaned}`).catch(() => {});
    }
    onClose();
  };
  const handleWhatsApp = () => {
    onContact?.('WHATSAPP');
    if (cleaned) {
      const msg = whatsappMessage ?? `Hi! Regarding my booking${venueName ? ` at ${venueName}` : ''}.`;
      Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`).catch(() => {});
    }
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.dialogTitle}>Contact venue</Text>
          <Text style={styles.dialogMsg}>
            {venueName ? `Reach out to ${venueName}` : 'Reach out to the venue'}
          </Text>

          <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.8}>
            <View style={styles.contactCircleCall}><Text style={styles.contactCallIcon}>📞</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Call</Text>
              {phone ? <Text style={styles.contactSub}>{phone}</Text> : null}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactRow} onPress={handleWhatsApp} activeOpacity={0.8}>
            <View style={styles.contactCircleWa}><Text style={styles.contactWaLetter}>W</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactSub}>Chat on WhatsApp</Text>
            </View>
          </TouchableOpacity>

          <AppButton label="Cancel" variant="secondary" onPress={onClose} style={{ marginTop: spacing.md }} />
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

/* ───────────────── BookingRequestModal ───────────────── */
interface SlotEntry {
  startTime: string;
  endTime: string;
  price: number;
}

interface BookingRequestProps {
  visible: boolean;
  venueName: string;
  sport: string;
  date: string;
  slots: SlotEntry[];
  onConfirm: () => Promise<void>;
  onDismiss: () => void;
  onGoToBookings: () => void;
}

export function BookingRequestModal({
  visible, venueName, sport, date, slots,
  onConfirm, onDismiss, onGoToBookings,
}: BookingRequestProps) {
  const [phase, setPhase] = React.useState<'confirm' | 'loading' | 'success' | 'error'>('confirm');
  const [errorMsg, setErrorMsg] = React.useState('');

  const totalPrice = slots.reduce((sum, s) => sum + s.price, 0);

  const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const isContiguous =
    sortedSlots.length > 1 &&
    sortedSlots.every((s, i) => i === 0 || s.startTime === sortedSlots[i - 1].endTime);
  const mergedTimeRange = isContiguous
    ? `${sortedSlots[0].startTime} to ${sortedSlots[sortedSlots.length - 1].endTime}`
    : null;

  React.useEffect(() => {
    if (visible) setPhase('confirm');
  }, [visible]);

  const handleConfirm = async () => {
    setPhase('loading');
    try {
      await onConfirm();
      setPhase('success');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Something went wrong. Please try again.');
      setPhase('error');
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={phase !== 'loading' ? onDismiss : undefined}
    >
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />

          {phase === 'confirm' && (
            <>
              <Text style={styles.dialogTitle}>Confirm Booking</Text>
              <View style={brStyles.summaryBox}>
                <BRRow label="Venue" value={venueName} />
                <BRRow label="Sport" value={sport} />
                <BRRow label="Date" value={date} />
                {slots.length === 1 ? (
                  <BRRow label="Time" value={`${slots[0].startTime} – ${slots[0].endTime}`} />
                ) : mergedTimeRange ? (
                  <>
                    <BRRow label="Slots" value={`${slots.length} slots`} />
                    <BRRow label="Time" value={mergedTimeRange} />
                  </>
                ) : (
                  <>
                    <BRRow label="Slots" value={`${slots.length} slots selected`} />
                    {sortedSlots.map((s) => (
                      <BRRow key={s.startTime} label="" value={`${s.startTime} – ${s.endTime}`} />
                    ))}
                  </>
                )}
              </View>
              <View style={brStyles.priceRow}>
                <Text style={brStyles.priceLabel}>
                  {slots.length === 1 ? 'Slot Price' : 'Total Price'}
                </Text>
                <Text style={brStyles.priceValue}>₹{totalPrice}</Text>
              </View>
              <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
                <AppButton label="Confirm Booking" onPress={handleConfirm} />
                <AppButton label="Cancel" variant="secondary" onPress={onDismiss} />
              </View>
            </>
          )}

          {phase === 'loading' && (
            <View style={brStyles.centeredContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={brStyles.loadingText}>Sending booking request…</Text>
            </View>
          )}

          {phase === 'success' && (
            <View style={brStyles.centeredContent}>
              <View style={brStyles.successCircle}>
                <Text style={{ fontSize: 36 }}>✓</Text>
              </View>
              <Text style={[styles.dialogTitle, { textAlign: 'center', marginTop: spacing.lg }]}>
                Booking Request Sent!
              </Text>
              <Text style={[styles.dialogMsg, { textAlign: 'center' }]}>
                Your booking request has been sent successfully. The venue will confirm shortly.
              </Text>
              <AppButton label="Go to Bookings" onPress={onGoToBookings} style={{ marginTop: spacing.xl, width: '100%' }} />
              <AppButton label="Cancel" variant="secondary" onPress={onDismiss} />
            </View>
          )}

          {phase === 'error' && (
            <View style={brStyles.centeredContent}>
              <Text style={{ fontSize: 40, textAlign: 'center' }}>❌</Text>
              <Text style={[styles.dialogTitle, { textAlign: 'center' }]}>Request Failed</Text>
              <Text style={[styles.dialogMsg, { textAlign: 'center' }]}>{errorMsg}</Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.lg, width: '100%' }}>
                <AppButton label="Try Again" onPress={() => setPhase('confirm')} />
                <AppButton label="Cancel" variant="secondary" onPress={onDismiss} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function BRRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={brStyles.row}>
      <Text style={brStyles.rowLabel}>{label}</Text>
      <Text style={brStyles.rowValue}>{value}</Text>
    </View>
  );
}

const brStyles = StyleSheet.create({
  summaryBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rowValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    flex: 1,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  priceLabel: { fontSize: fontSize.md, color: colors.textMid },
  priceValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  centeredContent: { alignItems: 'center', paddingVertical: spacing.lg, width: '100%' },
  loadingText: { fontSize: fontSize.md, color: colors.textMid, marginTop: spacing.lg },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/* ───────────────── CheckInConfirmModal ───────────────── */
interface CheckInConfirmProps {
  visible: boolean;
  playerName: string;
  venueName: string;
  courtName: string;
  date: string;
  timeRange: string;
  slotsCount?: number;
  total: number;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}
export function CheckInConfirmModal({
  visible, playerName, venueName, courtName, date, timeRange, slotsCount, total, loading, onConfirm, onDismiss,
}: CheckInConfirmProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.sheetOverlay}>
        <View style={[styles.sheet, shadow.modal]}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={ciStyles.header}>
            <View style={ciStyles.iconCircle}>
              <Text style={{ fontSize: 26 }}>✅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dialogTitle}>Confirm Check In</Text>
              <Text style={[styles.dialogMsg, { marginTop: 2 }]}>Verify the booking before checking in</Text>
            </View>
          </View>

          {/* Details */}
          <View style={ciStyles.summaryBox}>
            <CIRow icon="👤" label="Player" value={playerName} />
            <CIRow icon="🏟" label="Venue" value={venueName} />
            <CIRow icon="🏐" label="Court" value={courtName} />
            <CIRow icon="📅" label="Date" value={date} />
            <CIRow icon="⏰" label="Time" value={timeRange} />
            {slotsCount && slotsCount > 1 && (
              <CIRow icon="🎯" label="Slots" value={`${slotsCount} slots`} />
            )}
          </View>

          {/* Total */}
          <View style={ciStyles.totalRow}>
            <Text style={ciStyles.totalLabel}>Total Amount</Text>
            <Text style={ciStyles.totalValue}>₹{total}</Text>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
            <AppButton label="Cancel" variant="secondary" onPress={onDismiss} disabled={loading} style={{ flex: 1 }} />
            <AppButton label="✓ Check In" onPress={onConfirm} loading={loading} disabled={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CIRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={ciStyles.row}>
      <Text style={ciStyles.rowIcon}>{icon}</Text>
      <Text style={ciStyles.rowLabel}>{label}</Text>
      <Text style={ciStyles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const ciStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  rowIcon: { fontSize: 14, width: 22 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMid, width: 56 },
  rowValue: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: fontSize.md, color: colors.textMid },
  totalValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
});

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
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.md, backgroundColor: colors.surface,
  },
  contactCircleCall: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  contactCallIcon: { fontSize: 18 },
  contactCircleWa: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  contactWaLetter: { color: '#fff', fontSize: 18, fontWeight: fontWeight.bold },
  contactLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  contactSub: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
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
