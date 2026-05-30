import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, StatusBadge } from '../../components/common';
import { CancelBookingModal, ConfirmActionModal } from '../../modals';
import { BOOKINGS } from '../../data/mockData';

export default function BookingDetailScreen({ navigation, route }: any) {
  const booking = BOOKINGS.find((b) => b.id === route.params.bookingId)!;
  const [showCancel, setShowCancel] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Booking Details" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={[styles.card, shadow.card]}>
          <View style={styles.qrBox}>
            <Text style={{ fontSize: 56 }}>🔲</Text>
            <Text style={styles.bookingId}>Booking #{booking.id.toUpperCase()}</Text>
            <StatusBadge status={booking.status} />
          </View>
        </View>

        <View style={[styles.card, shadow.card, { marginTop: spacing.lg }]}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Image source={{ uri: booking.venuePhoto }} style={styles.venueImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.venueName}>{booking.venueName}</Text>
              <Text style={styles.meta}>{booking.sport} · {booking.courtName}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Row label="Date" value={booking.date} />
          <Row label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Row label="Player" value={booking.playerName} />
        </View>

        <View style={[styles.card, shadow.card, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Payment Receipt</Text>
          <Row label="Amount Paid" value={`₹${booking.amount}`} />
          <Row label="Payment Status" value="" badge={booking.paymentStatus} />
        </View>

        <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
          {booking.status === 'confirmed' && (
            <AppButton label="Cancel Booking" variant="danger" onPress={() => setShowCancel(true)} />
          )}
          <AppButton label="Download Invoice" variant="secondary" onPress={() => setShowInvoice(true)} />
        </View>
      </ScrollView>

      <CancelBookingModal
        visible={showCancel}
        venueName={booking.venueName}
        refundAmount={Math.round(booking.amount * 0.5)}
        onConfirm={() => { setShowCancel(false); navigation.goBack(); }}
        onDismiss={() => setShowCancel(false)}
      />
      <ConfirmActionModal
        visible={showInvoice}
        title="Download Invoice"
        message="The invoice PDF will be saved to your device."
        confirmLabel="Download"
        onConfirm={() => setShowInvoice(false)}
        onDismiss={() => setShowInvoice(false)}
      />
    </SafeAreaView>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {badge ? <StatusBadge status={badge} /> : <Text style={styles.rowValue}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  qrBox: { alignItems: 'center', gap: spacing.sm },
  bookingId: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  venueImg: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  venueName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.semibold },
});
