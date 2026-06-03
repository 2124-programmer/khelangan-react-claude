// Reusable shared UI components used across all roles.
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Image, ScrollView, ViewStyle,
} from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { BookingStatus, VenueStatus, PaymentStatus } from '../../types';

/* ───────────────── AppButton ───────────────── */
interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: string;
  style?: ViewStyle;
}
export function AppButton({
  label, onPress, variant = 'primary', loading, disabled, fullWidth = true, icon, style,
}: AppButtonProps) {
  const bg =
    variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.surfaceAlt
    : 'transparent';
  const txt =
    variant === 'secondary' ? colors.text
    : variant === 'ghost' ? colors.primary
    : colors.white;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: colors.primary },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txt} />
      ) : (
        <Text style={[styles.btnText, { color: txt }]}>
          {icon ? `${icon}  ` : ''}{label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

/* ───────────────── AppInput ───────────────── */
interface AppInputProps {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}
export function AppInput({
  label, value, onChangeText, placeholder, error, secureTextEntry,
  keyboardType, multiline, maxLength, autoCapitalize = 'none',
}: AppInputProps) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          multiline && { height: 96, textAlignVertical: 'top', paddingTop: spacing.md },
          error ? { borderColor: colors.danger } : {},
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/* ───────────────── AppHeader ───────────────── */
interface AppHeaderProps {
  title?: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  // Home screen variant
  userName?: string;
  onBellPress?: () => void;
}
export function AppHeader({ title, onBack, rightLabel, onRightPress, userName, onBellPress }: AppHeaderProps) {
  if (userName !== undefined) {
    return (
      <View style={styles.homeHeader}>
        {/* Left: logo */}
        <View style={styles.homeLogoWrap}>
          <Image
            source={require('../../../assets/logo/score-adda-logo.png')}
            style={styles.homeLogo}
            resizeMode="contain"
          />
        </View>
        {/* Right: user name then bell */}
        <View style={styles.homeRight}>
          <Text style={styles.homeUserName} numberOfLines={1}>{userName}</Text>
          {onBellPress ? (
            <TouchableOpacity onPress={onBellPress} activeOpacity={0.7} style={styles.bellBtn}>
              <Text style={styles.bellIcon}>🔔</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Text style={styles.headerBackIcon}>‹</Text>
        </TouchableOpacity>
      ) : <View style={styles.headerBtn} />}
      <Text style={styles.headerTitle} numberOfLines={1}>{title ?? ''}</Text>
      {rightLabel ? (
        <TouchableOpacity onPress={onRightPress} style={styles.headerBtn}>
          <Text style={styles.headerRight}>{rightLabel}</Text>
        </TouchableOpacity>
      ) : <View style={styles.headerBtn} />}
    </View>
  );
}

/* ───────────────── StatusBadge ───────────────── */
type AnyStatus = BookingStatus | VenueStatus | PaymentStatus | string;
export function StatusBadge({ status }: { status: AnyStatus }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    confirmed: { bg: '#DCFCE7', fg: '#15803D', label: 'Confirmed' },
    completed: { bg: '#E0E7FF', fg: '#4338CA', label: 'Completed' },
    cancelled: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Cancelled' },
    pending: { bg: '#FEF3C7', fg: '#B45309', label: 'Pending' },
    live: { bg: '#DCFCE7', fg: '#15803D', label: 'Live' },
    rejected: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Rejected' },
    suspended: { bg: '#F3F4F6', fg: '#6B7280', label: 'Suspended' },
    success: { bg: '#DCFCE7', fg: '#15803D', label: 'Paid' },
    failed: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Failed' },
    refunded: { bg: '#E0E7FF', fg: '#4338CA', label: 'Refunded' },
    settled: { bg: '#DCFCE7', fg: '#15803D', label: 'Settled' },
    processing: { bg: '#FEF3C7', fg: '#B45309', label: 'Processing' },
    open: { bg: '#FEF3C7', fg: '#B45309', label: 'Open' },
    resolved: { bg: '#DCFCE7', fg: '#15803D', label: 'Resolved' },
    active: { bg: '#DCFCE7', fg: '#15803D', label: 'Active' },
    inactive: { bg: '#F3F4F6', fg: '#6B7280', label: 'Inactive' },
    blocked: { bg: '#FEE2E2', fg: '#B91C1C', label: 'Blocked' },
    verified: { bg: '#DCFCE7', fg: '#15803D', label: 'Verified' },
  };
  const s = map[status] ?? { bg: colors.surfaceAlt, fg: colors.textMid, label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

/* ───────────────── StarRating ───────────────── */
interface StarRatingProps {
  value: number;
  size?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
}
export function StarRating({ value, size = 16, interactive, onChange }: StarRatingProps) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          disabled={!interactive}
          onPress={() => onChange?.(i)}
          activeOpacity={interactive ? 0.6 : 1}
        >
          <Text style={{ fontSize: size, color: i <= value ? colors.star : colors.border }}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ───────────────── AvatarImage ───────────────── */
export function AvatarImage({ uri, name, size = 48 }: { uri?: string; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: colors.primaryDark, fontWeight: fontWeight.bold, fontSize: size / 2.5 }}>
        {initials}
      </Text>
    </View>
  );
}

/* ───────────────── SectionTabBar ───────────────── */
interface SectionTabBarProps {
  tabs: { label: string; value: string }[];
  activeTab: string;
  onChange: (v: string) => void;
}
export function SectionTabBar({ tabs, activeTab, onChange }: SectionTabBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
      {tabs.map((t) => {
        const active = t.value === activeTab;
        return (
          <TouchableOpacity
            key={t.value}
            onPress={() => onChange(t.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ───────────────── EmptyState ───────────────── */
export function EmptyState({ icon = '📭', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 48, marginBottom: spacing.md }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

/* ───────────────── Card ───────────────── */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ───────────────── StatCard ───────────────── */
export function StatCard({ label, value, accent = colors.primary }: { label: string; value: string; accent?: string }) {
  return (
    <View style={[styles.statCard, shadow.card]}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ───────────────── SportChip ───────────────── */
export function SportChip({ icon, name, active, onPress }: { icon: string; name: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.sportChip, active && styles.sportChipActive]}
    >
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={[styles.sportChipText, active && { color: colors.white }]}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  inputLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, height: 50,
    fontSize: fontSize.md, color: colors.text,
  },
  errorText: { color: colors.danger, fontSize: fontSize.xs, marginTop: spacing.xs },
  header: {
    flexDirection: 'row', alignItems: 'center', height: 56,
    paddingHorizontal: spacing.sm, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  homeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  homeLogoWrap: {
    width: 120, height: 55, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: '#111',
  },
  homeLogo: { width: '100%', height: '100%' },
  homeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bellBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  bellIcon: { fontSize: 17 },
  homeUserInfo: { alignItems: 'flex-end' },
  homeUserName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  homeLocation: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  headerBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  headerBackIcon: { fontSize: 34, color: colors.text, marginTop: -4 },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: fontSize.lg,
    fontWeight: fontWeight.bold, color: colors.text,
  },
  headerRight: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  tabBar: { flexGrow: 0, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginRight: spacing.sm, backgroundColor: colors.surfaceAlt },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  tabTextActive: { color: colors.white },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  emptySub: { fontSize: fontSize.sm, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, margin: spacing.xs,
  },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold },
  statLabel: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 2 },
  sportChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt, marginRight: spacing.sm,
  },
  sportChipActive: { backgroundColor: colors.primary },
  sportChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
});
