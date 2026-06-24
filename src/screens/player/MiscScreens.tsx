import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator, RefreshControl, Linking, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { toast } from '../../toast';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput, AvatarImage, LoadingOverlay } from '../../components/common';
import { useCoupons } from '../../api/hooks/useCoupons';
import { useAuth } from '../../store/AuthContext';
import { useMe, useUpdateProfile, useUploadAvatar } from '../../api/hooks/useUser';
import { useCreateDispute } from '../../api/hooks/useDisputes';
import { extractApiError } from '../../api/client';
import { userService } from '../../api/services/userService';
import { validatePhone } from '../../utils/validation';
import type { UserRole } from '../../types';

/* ───────────────── OffersScreen ───────────────── */
export function OffersScreen({ navigation }: any) {
  const { data: coupons = [], isLoading, refetch } = useCoupons();
  const active = coupons.filter((c) => c.isActive);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Offers & Coupons"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <LoadingOverlay visible={isLoading} />
        ) : (
          active.map((c) => (
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
          ))
        )}
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
          <Text style={styles.walletAmount}>₹0</Text>
          <AppButton label="Add Money" variant="secondary" onPress={() => {}} style={{ marginTop: spacing.lg }} />
        </View>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <Text style={{ color: colors.textMid, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xl }}>
          No transactions yet
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── HelpSupportScreen ───────────────── */
// Enable LayoutAnimation on Android (no-op on the new architecture / iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_EMAIL = 'support@khelangan.com';

// Answers reflect the platform money model: the platform processes no payments,
// so refunds are settled by the venue/owner directly (never a platform refund).
const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I cancel a booking?',
    a: 'Open the booking from the Bookings tab and tap Cancel. Whether a cancellation is allowed and any cancellation window depend on the venue’s policy, shown on the booking. Once cancelled, you’ll see the updated status straight away.',
  },
  {
    q: 'Can I reschedule a booking?',
    a: 'Rescheduling depends on the venue. If the venue allows it, you can pick a new slot from the booking details; otherwise cancel (subject to the venue’s policy) and book the new slot. The venue’s contact is on the booking if you need to coordinate.',
  },
  {
    q: 'When will I get my refund?',
    a: 'Khelangan does not collect or hold your booking payment — you pay the venue directly. So refunds are handled by the venue/owner directly, as per their policy and the method you paid with. If you’re facing an issue, contact the venue first; if it isn’t resolved, raise a dispute and our team will help.',
  },
  {
    q: 'How do I apply a coupon?',
    a: 'Offers are run by venues (owner-funded promos). Find a code under Offers & Coupons, then enter or select it during checkout for a covered venue — the discount applies to what you pay the venue. A coupon must be active, within its validity window, and within its usage limit.',
  },
  {
    q: 'Is my booking confirmed instantly?',
    a: 'Yes — once a slot is booked it’s held for you and appears under Bookings with a confirmed status. You’ll also get a notification. If a venue requires approval, the status will show as pending until the venue confirms.',
  },
  {
    q: 'How do I contact a venue?',
    a: 'The venue’s phone and address are shown on the venue page and on your booking. For booking-specific questions (timing, equipment, access), contacting the venue directly is the fastest route.',
  },
];

function FaqAccordion({ item, expanded, onToggle }: { item: { q: string; a: string }; expanded: boolean; onToggle: () => void }) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqRow}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.faqText}>{item.q}</Text>
        <Text style={[styles.faqChevron, expanded && styles.faqChevronOpen]}>{expanded ? '⌄' : '›'}</Text>
      </TouchableOpacity>
      {expanded ? (
        <View style={styles.faqAnswerWrap}>
          <Text style={styles.faqAnswer}>{item.a}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function HelpSupportScreen({ navigation }: any) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex((prev) => (prev === i ? null : i));
  };

  const handleContact = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Khelangan support request')}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else toast.info(`Email us at ${SUPPORT_EMAIL}`);
    } catch {
      toast.info(`Email us at ${SUPPORT_EMAIL}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.sectionTitle}>FAQs</Text>
        {FAQS.map((f, i) => (
          <FaqAccordion key={f.q} item={f} expanded={openIndex === i} onToggle={() => toggle(i)} />
        ))}

        <Text style={styles.faqHint}>Still need help? Reach our team directly.</Text>
        <AppButton label="Contact Support" onPress={handleContact} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── SettingsScreen ───────────────── */
export function SettingsScreen({ navigation }: any) {
  const [push, setPush] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);

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
          <Switch value={emailNotif} onValueChange={setEmailNotif} trackColor={{ true: colors.primary }} />
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Security')}>
          <Text style={styles.toggleLabel}>Security</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── EditProfileScreen ───────────────── */
export function EditProfileScreen({ navigation }: any) {
  const { data: me, isLoading: meLoading, isError, refetch } = useMe();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed form once me data arrives
  useEffect(() => {
    if (me) {
      setName(me.name ?? '');
      setPhone(me.phone ?? '');
    }
  }, [me]);

  const isDirty =
    name.trim() !== (me?.name ?? '') ||
    phone.trim() !== (me?.phone ?? '') ||
    localAvatarUri !== null;

  const validateForm = () => {
    const nErr = name.trim() ? null : 'Name is required';
    const pErr = phone.trim() ? validatePhone(phone.trim()) : null; // null phone = optional
    setNameError(nErr);
    setPhoneError(pErr);
    return !nErr && !pErr;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to pick a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (localAvatarUri) {
        const res = await uploadAvatar.mutateAsync(localAvatarUri);
        avatarUrl = res.url;
      }
      await updateProfile.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl,
      });
      toast.success('Profile updated.');
      navigation.goBack();
    } catch (err) {
      toast.error(extractApiError(err) || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (meLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Edit Profile" onBack={() => navigation.goBack()} />
        <LoadingOverlay visible={meLoading} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Edit Profile" onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.textMid, marginBottom: spacing.md }}>Failed to load profile.</Text>
          <AppButton label="Retry" onPress={() => refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const avatarUri = localAvatarUri ?? me?.avatar;
  const displayName = (name || me?.name) ?? '';

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Edit Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>

        {/* Avatar picker */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
          <AvatarImage uri={avatarUri} name={displayName} size={88} />
          <View style={styles.pencilBadge}>
            <Text style={styles.pencilIcon}>✏️</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>

        <AppInput
          label="Full Name"
          value={name}
          onChangeText={(v) => { setName(v); if (nameError) setNameError(null); }}
          error={nameError ?? undefined}
        />
        <AppInput
          label="Email"
          value={me?.email ?? ''}
          onChangeText={() => {}}
          keyboardType="email-address"
          editable={false}
        />
        <TouchableOpacity onPress={() => navigation.navigate('EmailChange')} style={styles.emailChangeLink}>
          <Text style={styles.emailChangeLinkText}>Request email change →</Text>
        </TouchableOpacity>
        <AppInput
          label="Phone"
          value={phone}
          onChangeText={(v) => { setPhone(v); if (phoneError) setPhoneError(null); }}
          keyboardType="phone-pad"
          placeholder="10-digit mobile number"
          error={phoneError ?? undefined}
        />

        <AppButton
          label={saving ? 'Saving…' : 'Save Changes'}
          loading={saving}
          disabled={!isDirty || saving}
          onPress={handleSave}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
      <LoadingOverlay visible={saving} />
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
export function DisputeScreen({ navigation, route }: any) {
  const bookingId: string | undefined = route?.params?.bookingId;
  const createDispute = useCreateDispute();
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!issue.trim() || !bookingId) return;
    setLoading(true);
    try {
      await createDispute.mutateAsync({ bookingId: Number(bookingId), issue: issue.trim() });
      Alert.alert('Dispute Raised', 'Our team will review your dispute within 24 hours.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Raise a Dispute" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <AppInput
          label="Describe your issue"
          value={issue}
          onChangeText={setIssue}
          multiline
          placeholder="What went wrong?"
        />
        <AppButton
          label={loading ? 'Submitting…' : 'Submit Dispute'}
          onPress={handleSubmit}
          loading={loading}
          disabled={!issue.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ───────────────── RoleChangeScreen ───────────────── */
export function RoleChangeScreen({ navigation, route }: any) {
  const targetRole: 'PLAYER' | 'OWNER' = route?.params?.targetRole ?? 'PLAYER';
  const { updateSession } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const label = targetRole === 'OWNER' ? 'Venue Owner' : 'Player';

  const handleConfirm = async () => {
    if (!password.trim()) return;
    setLoading(true);
    try {
      const res = await userService.changeRole({ targetRole, password });
      if (!res.token || !res.user) throw new Error('Invalid server response');
      // updateSession saves new token + updates user; RootNavigator re-routes automatically
      await updateSession(res.token, res.user);
    } catch (err) {
      Alert.alert('Role Change Failed', extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={`Switch to ${label}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.roleInfoBox}>
          <Text style={styles.roleInfoIcon}>{targetRole === 'OWNER' ? '🏟' : '👤'}</Text>
          <Text style={styles.roleInfoTitle}>Switch to {label}</Text>
          <Text style={styles.roleInfoBody}>
            {targetRole === 'OWNER'
              ? 'You\'ll be able to list and manage sports venues, track bookings, and receive payouts.'
              : 'You\'ll be able to browse and book venues. Your existing venue data will remain but you won\'t be able to manage it.'}
          </Text>
        </View>
        <AppInput
          label="Confirm your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter current password"
        />
        <AppButton
          label={loading ? 'Switching…' : `Switch to ${label}`}
          loading={loading}
          disabled={!password.trim()}
          onPress={handleConfirm}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.md },
  avatarWrapper: { alignSelf: 'center', marginBottom: spacing.xs, position: 'relative' },
  pencilBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pencilIcon: { fontSize: 13 },
  avatarHint: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMid, marginBottom: spacing.lg },
  xxl: { marginTop: spacing.xl },
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
  faqItem: { backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  faqRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  faqText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, flex: 1 },
  faqChevron: { fontSize: 22, color: colors.textDim },
  faqChevronOpen: { color: colors.primary },
  faqAnswerWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: 0 },
  faqAnswer: { fontSize: fontSize.sm, lineHeight: 20, color: colors.textMid },
  faqHint: { fontSize: fontSize.sm, color: colors.textMid, textAlign: 'center', marginTop: spacing.xl },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
  menuArrow: { fontSize: 22, color: colors.textDim },
  roleInfoBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  roleInfoIcon: { fontSize: 40, marginBottom: spacing.sm },
  roleInfoTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs },
  roleInfoBody: { fontSize: fontSize.sm, color: colors.textMid, textAlign: 'center', lineHeight: 20 },
  emailChangeLink: { marginTop: -spacing.xs, marginBottom: spacing.md, alignSelf: 'flex-end' },
  emailChangeLinkText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
});
