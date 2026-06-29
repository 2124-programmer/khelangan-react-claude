import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton } from '../../components/common';
import { PriceSummary } from '../../components/venue';
import { CouponApplyModal } from '../../modals';
import { useVenueDetail } from '../../api/hooks/useVenues';
import { useCoupons, useValidateCoupon } from '../../api/hooks/useCoupons';
import { usePlatformSettings } from '../../api/hooks/useAdmin';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI (GPay, PhonePe)', icon: '📲' },
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'wallet', label: 'TurfBook Wallet', icon: '👛' },
];

export default function BookingConfirmScreen({ navigation, route }: any) {
  const { venueId, sport, date, slotPrice, startTime, endTime, courtId } = route.params;

  const { data: venue } = useVenueDetail(venueId);
  const { data: coupons = [] } = useCoupons();
  const { data: settings } = usePlatformSettings();
  const validateCoupon = useValidateCoupon();

  const convenienceFee = settings?.convenienceFee ?? 20;
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [showCoupon, setShowCoupon] = useState(false);
  const [method, setMethod] = useState('card');

  const total = slotPrice + convenienceFee - discount;

  const handleApplyCoupon = async (code: string) => {
    try {
      const res = await validateCoupon.mutateAsync({ code, bookingAmount: slotPrice });
      if (res.valid) {
        setCouponCode(code);
        setDiscount(res.discount ?? 0);
      } else {
        Alert.alert('Invalid Coupon', res.message ?? 'Coupon is not valid.');
      }
    } catch {
      Alert.alert('Error', 'Could not validate coupon. Please try again.');
    }
    setShowCoupon(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader title="Confirm Booking" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        {/* Summary */}
        <View style={[styles.summary, shadow.card]}>
          <Text style={styles.venueName}>{venue?.name ?? '—'}</Text>
          <Row label="Sport" value={sport} />
          <Row label="Date" value={date} />
          <Row label="Time" value={`${startTime} – ${endTime}`} />
          <Row label="Address" value={venue?.address ?? '—'} />
        </View>

        {/* Coupon */}
        <TouchableOpacity style={styles.couponBtn} onPress={() => setShowCoupon(true)}>
          <Text style={{ fontSize: 18 }}>🎟️</Text>
          <Text style={styles.couponText}>
            {couponCode ? `Coupon "${couponCode}" applied` : 'Apply Coupon'}
          </Text>
          <Text style={styles.couponArrow}>›</Text>
        </TouchableOpacity>

        {/* Payment method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {PAYMENT_METHODS.map((m) => (
          <TouchableOpacity
            key={m.id}
            onPress={() => setMethod(m.id)}
            style={[styles.methodRow, method === m.id && styles.methodRowActive]}
          >
            <Text style={{ fontSize: 20 }}>{m.icon}</Text>
            <Text style={styles.methodLabel}>{m.label}</Text>
            <View style={[styles.radio, method === m.id && styles.radioActive]}>
              {method === m.id && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Price */}
        <Text style={styles.sectionTitle}>Price Details</Text>
        <PriceSummary base={slotPrice} fee={convenienceFee} discount={discount} total={total} />
      </ScrollView>

      <View style={[styles.bottomBar, shadow.modal]}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>
        <AppButton
          label="Pay & Confirm"
          fullWidth={false}
          onPress={() =>
            navigation.navigate('Payment', {
              venueId,
              courtId,
              sport,
              date,
              startTime,
              endTime,
              slotPrice,
              total,
              method,
              couponCode,
              venueName: venue?.name,
            })
          }
          style={{ paddingHorizontal: 32 }}
        />
      </View>

      <CouponApplyModal
        visible={showCoupon}
        coupons={coupons
          .filter((c) => c.isActive)
          .map((c) => ({
            code: c.code,
            label:
              c.discountType === 'percent'
                ? `${c.discountValue}% off (min ₹${c.minBooking})`
                : `₹${c.discountValue} off (min ₹${c.minBooking})`,
          }))}
        onApply={handleApplyCoupon}
        onDismiss={() => setShowCoupon(false)}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  venueName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold, flex: 1, textAlign: 'right' },
  couponBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed' },
  couponText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.primary },
  couponArrow: { fontSize: 22, color: colors.primary },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.border },
  methodRowActive: { borderColor: colors.primary },
  methodLabel: { flex: 1, fontSize: fontSize.md, color: colors.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { fontSize: fontSize.xs, color: colors.textDim },
  totalValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
});
