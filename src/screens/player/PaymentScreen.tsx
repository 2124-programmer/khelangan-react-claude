import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppHeader, AppButton } from '../../components/common';
import { PaymentFailedModal } from '../../modals';

export default function PaymentScreen({ navigation, route }: any) {
  const { total } = route.params;
  const [processing, setProcessing] = useState(false);
  const [showFailed, setShowFailed] = useState(false);

  const pay = (succeed: boolean) => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      if (succeed) navigation.replace('BookingSuccess', route.params);
      else setShowFailed(true);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Payment" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount to pay</Text>
          <Text style={styles.amount}>₹{total}</Text>
        </View>

        {processing ? (
          <View style={styles.processing}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.processingText}>Processing payment...</Text>
          </View>
        ) : (
          <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
            <Text style={styles.demoNote}>
              💡 This is a demo. Choose an outcome to simulate the payment gateway response.
            </Text>
            <AppButton label="Simulate Successful Payment" onPress={() => pay(true)} />
            <AppButton label="Simulate Failed Payment" variant="danger" onPress={() => pay(false)} />
          </View>
        )}
      </View>

      <PaymentFailedModal
        visible={showFailed}
        onRetry={() => setShowFailed(false)}
        onDismiss={() => { setShowFailed(false); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.xl },
  amountBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  amountLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  amount: { fontSize: 44, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.xs },
  processing: { alignItems: 'center', marginTop: 80 },
  processingText: { fontSize: fontSize.md, color: colors.textMid, marginTop: spacing.lg },
  demoNote: { fontSize: fontSize.sm, color: colors.textMid, backgroundColor: colors.surfaceAlt, padding: spacing.lg, borderRadius: radius.md, lineHeight: 20 },
});
