import React from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppButton } from '../../components/common';
import { centeredContent } from '../../responsive';

export default function BookingSuccessScreen({ navigation, route }: any) {
  const { bookingId: rawBookingId, sport, date, startTime, endTime, total, venueName } = route.params;
  const bookingId = rawBookingId ? `TB${String(rawBookingId).padStart(6, '0')}` : 'TB' + Math.floor(100000 + Math.random() * 900000);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={[styles.body, centeredContent]}>
        <View style={styles.checkCircle}>
          <Text style={{ fontSize: 48 }}>✅</Text>
        </View>
        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.sub}>Your slot is reserved. See you on the field!</Text>

        <View style={[styles.card, shadow.card]}>
          <View style={styles.qrBox}>
            <Text style={{ fontSize: 64 }}>🔲</Text>
            <Text style={styles.qrLabel}>Show at venue</Text>
          </View>
          <Row label="Booking ID" value={bookingId} />
          <Row label="Sport" value={sport} />
          <Row label="Date" value={date} />
          <Row label="Time" value={`${startTime} – ${endTime}`} />
          <Row label="Amount Paid" value={`₹${total}`} />
        </View>
      </View>

      <View style={[styles.footer, centeredContent]}>
        <AppButton label="View My Bookings" onPress={() => navigation.navigate('Bookings')} />
        <View style={{ height: spacing.md }} />
        <AppButton label="Back to Home" variant="secondary" onPress={() => navigation.navigate('HomeTab')} />
      </View>
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
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'space-between' },
  body: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xxl },
  checkCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg },
  sub: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  qrBox: { alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md },
  qrLabel: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: fontSize.sm, color: colors.textMid },
  rowValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.bold },
  footer: { padding: spacing.xl },
});
