import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput } from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { COUPONS } from '../../data/mockData';

/* ───────────────── OffersScreen ───────────────── */
export function OffersScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Offers & Coupons" onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {COUPONS.filter((c) => c.isActive).map((c) => (
          <View key={c.id} style={[styles.couponCard, shadow.card]}>
            <View style={styles.couponLeft}>
              <Text style={styles.couponDiscount}>
                {c.discountType === 'percent' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
              </Text>
              <Text style={styles.couponMin}>Min booking ₹{c.minBooking}</Text>
            </View>
            <View style={styles.couponRight}>
              <Text style={styles.couponCode}>{c.code}</Text>
              <Text style={styles.couponValid}>Valid till {c.validUntil}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── WalletScreen ───────────────── */
export function WalletScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Wallet & Payments" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <Text style={styles.walletAmount}>₹250</Text>
          <AppButton label="Add Money" variant="secondary" onPress={() => {}} style={{ marginTop: spacing.lg }} />
        </View>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {[
          { label: 'Booking refund — Ace Tennis', amount: '+₹620', date: 'May 15' },
          { label: 'Booking — Green Turf Arena', amount: '-₹1220', date: 'Jun 1' },
        ].map((t, i) => (
          <View key={i} style={styles.txnRow}>
            <View>
              <Text style={styles.txnLabel}>{t.label}</Text>
              <Text style={styles.txnDate}>{t.date}</Text>
            </View>
            <Text style={[styles.txnAmount, { color: t.amount.startsWith('+') ? colors.success : colors.text }]}>{t.amount}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── HelpSupportScreen ───────────────── */
export function HelpSupportScreen({ navigation }: any) {
  const faqs = [
    'How do I cancel a booking?',
    'When will I get my refund?',
    'How do I apply a coupon?',
    'Can I reschedule a booking?',
  ];
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.sectionTitle}>FAQs</Text>
        {faqs.map((f, i) => (
          <TouchableOpacity key={i} style={styles.faqRow}>
            <Text style={styles.faqText}>{f}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
        <AppButton label="Contact Support" onPress={() => {}} style={{ marginTop: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── SettingsScreen ───────────────── */
export function SettingsScreen({ navigation }: any) {
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Push Notifications</Text>
          <Switch value={push} onValueChange={setPush} trackColor={{ true: colors.primary }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Email Notifications</Text>
          <Switch value={email} onValueChange={setEmail} trackColor={{ true: colors.primary }} />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => setShowPwd(true)}>
          <Text style={styles.toggleLabel}>Change Password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow} onPress={() => setShowDelete(true)}>
          <Text style={[styles.toggleLabel, { color: colors.danger }]}>Delete Account</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConfirmActionModal visible={showPwd} title="Change Password" message="A reset link will be sent to your email." confirmLabel="Send Link" onConfirm={() => setShowPwd(false)} onDismiss={() => setShowPwd(false)} />
      <ConfirmActionModal visible={showDelete} title="Delete Account?" message="This is permanent and cannot be undone." confirmLabel="Delete" danger onConfirm={() => setShowDelete(false)} onDismiss={() => setShowDelete(false)} />
    </SafeAreaView>
  );
}

/* ───────────────── EditProfileScreen ───────────────── */
export function EditProfileScreen({ navigation }: any) {
  const [name, setName] = useState('Rohan Sharma');
  const [email, setEmail] = useState('rohan@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Edit Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppInput label="Full Name" value={name} onChangeText={setName} />
        <AppInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <AppInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <AppButton label="Save Changes" onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── RescheduleScreen ───────────────── */
export function RescheduleScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Reschedule Booking" onBack={() => navigation.goBack()} />
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.sectionTitle}>Pick a new slot</Text>
        <Text style={styles.toggleLabel}>Select a new date and time for your booking.</Text>
        <AppButton label="Confirm Reschedule" onPress={() => navigation.goBack()} style={{ marginTop: spacing.xl }} />
      </View>
    </SafeAreaView>
  );
}

/* ───────────────── DisputeScreen ───────────────── */
export function DisputeScreen({ navigation }: any) {
  const [issue, setIssue] = useState('');
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Raise a Dispute" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppInput label="Describe your issue" value={issue} onChangeText={setIssue} multiline placeholder="What went wrong?" />
        <AppButton label="Submit Dispute" onPress={() => navigation.goBack()} disabled={!issue} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  couponCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden' },
  couponLeft: { backgroundColor: colors.primary, padding: spacing.lg, justifyContent: 'center', minWidth: 120 },
  couponDiscount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white },
  couponMin: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  couponRight: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  couponCode: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  couponValid: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  walletCard: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center' },
  walletLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)' },
  walletAmount: { fontSize: 40, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.xs },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  txnLabel: { fontSize: fontSize.sm, color: colors.text },
  txnDate: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
  txnAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  faqText: { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
});
