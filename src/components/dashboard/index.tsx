import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type {
  CountMetric, MoneyMetric, MrrMetric, NeedsAttentionItem, TrendDirection, ManagementCounts,
  DashboardPeriod,
} from '../../types';

// ─── Formatting + deep-link helpers ──────────────────────────────────────────

/** ₹ prefix, no decimals, thousands grouped (Indian grouping): 10788 → ₹10,788. */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Derive greeting + date from the server `asOf`. The backend emits an Asia/Kolkata
 * OffsetDateTime (…+05:30), so the wall-clock parts in the string are already IST —
 * we read them directly to avoid device-timezone drift.
 */
export function dashboardGreeting(asOf: string | undefined): { greeting: string; dateLabel: string } {
  const m = asOf?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
  if (!m) return { greeting: 'Welcome', dateLabel: '' };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  // Compute weekday at UTC noon so it never shifts across the device's local midnight.
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()];
  const dateLabel = `${weekday} ${day} ${MONTHS[month - 1]}`;
  return { greeting, dateLabel };
}

/** Date as `dd MMM yyyy` (e.g. 24 Jun 2026) from an Asia/Kolkata ISO string. */
export function formatISTDate(iso: string | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function resolveDeepLink(
  navigation: { navigate: (screen: string, params?: Record<string, string>) => void },
  screen: string,
  params?: Record<string, string> | null,
): void {
  if (!screen) return;
  navigation.navigate(screen, params ?? undefined);
}

// ─── Period toggle ───────────────────────────────────────────────────────────

const PERIODS: { key: DashboardPeriod; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'Week' },
  { key: 'MONTH', label: 'Month' },
];

export function PeriodToggle({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <View style={styles.toggle}>
      {PERIODS.map((p) => {
        const active = p.key === period;
        return (
          <TouchableOpacity
            key={p.key}
            style={[styles.toggleBtn, active && styles.toggleBtnActive]}
            onPress={() => onChange(p.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Trend chip ──────────────────────────────────────────────────────────────

function TrendChip({ pct, direction }: { pct: number | null; direction: TrendDirection | null }) {
  // No previous-period baseline → render nothing (avoids a misleading 0% / divide-by-zero).
  if (pct === null || direction === null) return null;
  const up = direction === 'UP';
  const flat = direction === 'FLAT';
  const color = flat ? colors.textMid : up ? colors.success : colors.danger;
  const arrow = flat ? '→' : up ? '▲' : '▼';
  return (
    <View style={[styles.trendChip, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.trendText, { color }]}>
        {arrow} {Math.abs(pct)}%
      </Text>
    </View>
  );
}

// ─── Metric cards ────────────────────────────────────────────────────────────

export function MetricCard({
  label,
  value,
  metric,
  tone = 'NEUTRAL',
  onPress,
}: {
  label: string;
  value: string;
  metric?: CountMetric | MoneyMetric;
  tone?: 'NEUTRAL' | 'DANGER';
  onPress?: () => void;
}) {
  const danger = tone === 'DANGER';
  return (
    <TouchableOpacity
      style={[styles.card, shadow.card]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardValueRow}>
        <Text style={[styles.cardValue, danger && { color: colors.danger }]}>{value}</Text>
        {metric ? <TrendChip pct={metric.trendPct} direction={metric.trendDirection} /> : null}
      </View>
    </TouchableOpacity>
  );
}

/** MRR hero — the money the platform earns (subscriptions), distinct from booking volume. */
export function HeroMetricCard({
  mrr,
  onPress,
}: {
  mrr: MrrMetric;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.hero, shadow.card]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Monthly recurring revenue ${formatINR(mrr.amount)}, ${mrr.activeSubscriptions} active subscriptions`}
    >
      <View style={styles.heroHeaderRow}>
        <Text style={styles.heroLabel}>MONTHLY RECURRING REVENUE</Text>
        <TrendChip pct={mrr.trendPct} direction={mrr.trendDirection} />
      </View>
      <Text style={styles.heroValue}>{formatINR(mrr.amount)}</Text>
      <Text style={styles.heroSub}>
        {formatCount(mrr.activeSubscriptions)} active subscription{mrr.activeSubscriptions === 1 ? '' : 's'} · what the platform earns
      </Text>
    </TouchableOpacity>
  );
}

// ─── Needs Attention (one line, dims zeros, red non-zero) ─────────────────────

const ATTENTION_ICON: Record<string, string> = {
  PENDING_APPROVALS: '🕓',
  SUBSCRIPTION_REQUESTS: '🧾',
  OPEN_DISPUTES: '⚖️',
  EXPIRING_SUBSCRIPTIONS: '⏳',
  TRIALS_ENDING: '🎟',
};

export function NeedsAttentionRow({
  items,
  onPressItem,
}: {
  items: NeedsAttentionItem[];
  onPressItem: (item: NeedsAttentionItem) => void;
}) {
  if (!items.length) return null;
  return (
    <View style={styles.attentionWrap}>
      {items.map((item) => {
        const zero = item.count <= 0;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.attentionPill, zero && styles.attentionPillZero]}
            onPress={() => onPressItem(item)}
            disabled={zero}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.count}`}
          >
            <Text style={[styles.attentionIcon, zero && styles.attentionDim]}>
              {ATTENTION_ICON[item.key] ?? '•'}
            </Text>
            <Text style={[styles.attentionLabel, zero && styles.attentionDim]} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={[styles.attentionBadge, zero ? styles.attentionBadgeZero : styles.attentionBadgeActive]}>
              <Text style={[styles.attentionBadgeText, zero && styles.attentionBadgeTextZero]}>
                {formatCount(item.count)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Quiet state ─────────────────────────────────────────────────────────────

export function QuietState({ label }: { label: string }) {
  return (
    <View style={styles.quiet}>
      <Text style={styles.quietText}>🌿 {label}</Text>
    </View>
  );
}

// ─── Management grid (static tiles + bound counts) ────────────────────────────

type CountKey = keyof ManagementCounts;

interface TileDef {
  label: string;
  icon: string;
  route: string;
  countKey?: CountKey;
  danger?: boolean; // red chip when count > 0
}

const TILES: TileDef[] = [
  { label: 'Venues', icon: '🏟', route: 'Venues', countKey: 'venues' },
  { label: 'Players', icon: '👤', route: 'Players', countKey: 'players' },
  { label: 'Owners', icon: '🧑‍💼', route: 'OwnerManagement', countKey: 'owners' },
  { label: 'Bookings', icon: '📋', route: 'AdminBookings', countKey: 'bookings' },
  { label: 'Disputes', icon: '⚖️', route: 'DisputeManagement', countKey: 'openDisputes', danger: true },
  { label: 'Coupons', icon: '🎟️', route: 'CouponManagement', countKey: 'activeCoupons' },
  { label: 'Payments', icon: '💳', route: 'PaymentsRevenue' },
  { label: 'Analytics', icon: '📊', route: 'Analytics' },
  { label: 'Broadcast', icon: '📢', route: 'NotificationBroadcast' },
  { label: 'Sports', icon: '⚽', route: 'CategoryManagement' },
  { label: 'CMS', icon: '📄', route: 'CMS' },
];

export function ManagementGrid({
  counts,
  onPressTile,
}: {
  counts: ManagementCounts;
  onPressTile: (route: string) => void;
}) {
  return (
    <View style={styles.tileGrid}>
      {TILES.map((tile) => {
        const count = tile.countKey ? counts[tile.countKey] : undefined;
        const showCount = typeof count === 'number';
        const danger = !!tile.danger && (count ?? 0) > 0;
        return (
          <TouchableOpacity
            key={tile.label}
            style={[styles.tile, shadow.card]}
            onPress={() => onPressTile(tile.route)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={showCount ? `${tile.label}: ${count}` : tile.label}
          >
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
            {showCount ? (
              <View style={[styles.tileChip, danger && styles.tileChipDanger]}>
                <Text style={[styles.tileChipText, danger && styles.tileChipTextDanger]}>
                  {formatCount(count as number)}
                </Text>
              </View>
            ) : (
              <Text style={styles.tileChevron}>›</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadow.card },
  toggleText: { fontSize: fontSize.sm, color: colors.textMid, fontWeight: fontWeight.medium },
  toggleTextActive: { color: colors.text, fontWeight: fontWeight.bold },

  // trend chip
  trendChip: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  trendText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },

  // metric card
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardLabel: { fontSize: fontSize.xs, color: colors.textMid },
  cardValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardValue: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  // hero
  hero: {
    backgroundColor: colors.admin,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  heroValue: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.white },
  heroSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.9)' },

  // attention
  attentionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attentionPillZero: { opacity: 0.45, backgroundColor: colors.surfaceAlt },
  attentionIcon: { fontSize: 16 },
  attentionLabel: { flex: 1, fontSize: fontSize.xs, color: colors.text },
  attentionDim: { color: colors.textDim },
  attentionBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1, minWidth: 24, alignItems: 'center' },
  attentionBadgeActive: { backgroundColor: colors.danger },
  attentionBadgeZero: { backgroundColor: colors.border },
  attentionBadgeText: { fontSize: fontSize.xs, color: colors.white, fontWeight: fontWeight.bold },
  attentionBadgeTextZero: { color: colors.textDim },

  // quiet
  quiet: { paddingVertical: spacing.sm },
  quietText: { fontSize: fontSize.sm, color: colors.textMid, fontStyle: 'italic' },

  // tiles
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tileIcon: { fontSize: 22 },
  tileLabel: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  tileChip: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, minWidth: 26, alignItems: 'center' },
  tileChipDanger: { backgroundColor: colors.danger },
  tileChipText: { fontSize: fontSize.xs, color: colors.textMid, fontWeight: fontWeight.bold },
  tileChipTextDanger: { color: colors.white },
  tileChevron: { fontSize: fontSize.lg, color: colors.textDim },
});
