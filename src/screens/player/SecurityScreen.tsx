import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader } from '../../components/common';
import { useEmailChangeStatus } from '../../api/hooks/useEmailChange';

const STATUS_LABEL: Record<string, string> = {
  PENDING_VERIFICATION: 'Awaiting verification',
  PENDING: 'Pending admin review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_VERIFICATION: colors.warning,
  PENDING: colors.info,
  APPROVED: colors.success,
  REJECTED: colors.danger,
};

export default function SecurityScreen({ navigation }: any) {
  const { data: emailChangeStatus } = useEmailChangeStatus();
  const activeRequest = emailChangeStatus &&
    ['PENDING_VERIFICATION', 'PENDING'].includes(emailChangeStatus.status ?? '');

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Security" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>

        <Text style={styles.sectionTitle}>Password</Text>
        <View style={styles.card}>
          <Row
            icon="🔑"
            label="Change Password"
            sub="Update your current password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <View style={styles.divider} />
          <Row
            icon="📧"
            label="Reset via Email OTP"
            sub="Forgot your password? Reset it with a code"
            onPress={() => navigation.navigate('ForgotPassword', { fromSecurity: true })}
          />
        </View>

        <Text style={styles.sectionTitle}>Email Address</Text>
        <View style={styles.card}>
          <Row
            icon="✉️"
            label="Change Email"
            sub={activeRequest
              ? `Request status: ${STATUS_LABEL[emailChangeStatus!.status!]}`
              : 'Submit a request to update your email'}
            subColor={activeRequest ? STATUS_COLOR[emailChangeStatus!.status!] : undefined}
            onPress={() => navigation.navigate('EmailChange')}
          />
        </View>

        {emailChangeStatus?.status === 'REJECTED' && (
          <View style={styles.rejectedBox}>
            <Text style={styles.rejectedTitle}>Previous request rejected</Text>
            <Text style={styles.rejectedBody}>
              {emailChangeStatus.reason ?? 'No reason provided.'}
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon, label, sub, subColor, onPress,
}: {
  icon: string;
  label: string;
  sub?: string;
  subColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, subColor ? { color: subColor } : undefined]}>{sub}</Text> : null}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  rowIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  rowLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  rowSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  arrow: { fontSize: 22, color: colors.textDim },
  rejectedBox: {
    marginTop: spacing.lg,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  rejectedTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.danger },
  rejectedBody: { fontSize: fontSize.sm, color: colors.textMid, marginTop: spacing.xs },
});
