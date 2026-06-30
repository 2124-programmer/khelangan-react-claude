import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import type {
  CountMetric, MoneyMetric, MrrMetric, NeedsAttentionItem, TrendDirection, ManagementCounts,
  DashboardPeriod, VenueStatusCounts,
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
  COURT_CHANGE_REQUESTS: '🔁',
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
        const active = item.count > 0;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.attnCard}
            onPress={() => onPressItem(item)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.count}`}
          >
            <Text style={styles.attnIcon}>{ATTENTION_ICON[item.key] ?? '•'}</Text>
            <Text style={styles.attnLabel} numberOfLines={2}>{item.label}</Text>
            <Text style={[styles.attnValue, active ? styles.attnValueActive : styles.attnValueZero]}>
              {formatCount(item.count)}
            </Text>
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

// Numeric tile counts only (excludes the venuesByStatus object, which renders as its own card).
type CountKey = 'venues' | 'players' | 'owners' | 'bookings' | 'openDisputes' | 'activeCoupons';

interface TileDef {
  label: string;
  icon: string;
  route: string;
  countKey?: CountKey;
  danger?: boolean; // red chip when count > 0
}

const TILES: TileDef[] = [
  // 'Venues' is rendered separately as a status-breakdown card (see VenueStatusBreakdown).
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

// ─── Venues by status (clarity card for the Venues management entry) ──────────

/**
 * Status breakdown for the dashboard "Venues" card. Lifecycle chips (Live/Pending/Changes/Rejected)
 * always show; Suspended/Draft/Archived show only when non-zero. Tapping a chip deep-links into the
 * Venues list on the matching tab (Draft/Archived aren't listed there, so those are info-only).
 */
const VENUE_STATUS_CHIPS: { key: keyof VenueStatusCounts; label: string; color: string; tab?: string; always?: boolean }[] = [
  { key: 'live', label: 'Live', color: colors.success, tab: 'APPROVED', always: true },
  { key: 'pending', label: 'Pending', color: colors.warning, tab: 'PENDING', always: true },
  { key: 'changesRequested', label: 'Changes', color: colors.info, tab: 'CHANGES_REQUESTED', always: true },
  { key: 'rejected', label: 'Rejected', color: colors.danger, tab: 'REJECTED', always: true },
  { key: 'suspended', label: 'Suspended', color: colors.textMid, tab: 'APPROVED' },
  { key: 'draft', label: 'Draft', color: colors.textDim },
  { key: 'archived', label: 'Archived', color: colors.textDim },
];

type VenueChipDef = { key: keyof VenueStatusCounts; label: string; color: string; tab?: string; always?: boolean };

export function VenueStatusBreakdown({
  counts,
  total,
  onOpen,
}: {
  counts: VenueStatusCounts;
  total: number;
  onOpen: (tab?: string) => void;
}) {
  // 'Live' is promoted into the header (the headline status); the rest sit in the row below,
  // ordered non-zero first so meaningful counts (e.g. Draft) lead and the zeros trail.
  const live = VENUE_STATUS_CHIPS[0];
  const rest = VENUE_STATUS_CHIPS.slice(1)
    .filter((c) => c.always || counts[c.key] > 0)
    .sort((a, b) => (counts[b.key] > 0 ? 1 : 0) - (counts[a.key] > 0 ? 1 : 0));

  const renderChip = (c: VenueChipDef, large = false) => {
    const value = counts[c.key];
    // Dim zero-count chips so the meaningful (non-zero) statuses stand out at a glance.
    const zero = value === 0;
    const chip = (
      <View style={[styles.vbChip, large && styles.vbChipLg, { borderColor: zero ? colors.border : c.color + '55' }]}>
        <View style={[styles.vbDot, { backgroundColor: zero ? colors.border : c.color }]} />
        <Text style={[styles.vbChipLabel, zero && styles.vbChipLabelZero]}>{c.label}</Text>
        <Text style={[styles.vbChipCount, zero && styles.vbChipCountZero]}>{formatCount(value)}</Text>
      </View>
    );
    return c.tab ? (
      <TouchableOpacity key={c.key} activeOpacity={0.7} onPress={() => onOpen(c.tab)}
        accessibilityRole="button" accessibilityLabel={`${c.label}: ${formatCount(value)}`}>
        {chip}
      </TouchableOpacity>
    ) : (
      <View key={c.key}>{chip}</View>
    );
  };

  return (
    <View style={[styles.vbCard, shadow.card]}>
      <View style={styles.vbHeader}>
        <TouchableOpacity
          style={styles.vbHeaderLeft}
          onPress={() => onOpen()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Venues: ${formatCount(total)} listed`}
        >
          <View style={styles.tileIconBox}><Text style={styles.tileIconText}>🏟</Text></View>
          <View>
            <Text style={styles.vbTitle}>Venues</Text>
            <Text style={styles.vbSub}>{formatCount(total)} listed</Text>
          </View>
        </TouchableOpacity>
        {/* Live chip sits right beside the title (not flung to the far edge on wide screens). */}
        {renderChip(live, true)}
        <View style={styles.vbHeaderSpacer} />
        <Text style={styles.tileChevron}>›</Text>
      </View>

      <View style={styles.vbChips}>
        {rest.map((c) => renderChip(c))}
      </View>
    </View>
  );
}

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
            <View style={styles.tileIconBox}>
              <Text style={styles.tileIconText}>{tile.icon}</Text>
            </View>
            <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
            {showCount ? (
              <Text style={[styles.tileCount, danger && styles.tileCountDanger]}>
                {formatCount(count as number)}
              </Text>
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

  // metric card — 3 per row
  card: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
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

  // attention — icon + label + count inline, 3 per row
  attentionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attnCard: {
    width: '31%',
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attnIcon: { fontSize: 13 },
  attnLabel: { flex: 1, fontSize: 10, color: colors.textMid },
  attnValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  attnValueActive: { color: colors.danger },
  attnValueZero: { color: colors.text },

  // quiet
  quiet: { paddingVertical: spacing.sm },
  quietText: { fontSize: fontSize.sm, color: colors.textMid, fontStyle: 'italic' },

  // tiles — Quick-Actions-style (icon square on top, label, count below), 4 per row
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '22%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  tileIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconText: { fontSize: 20 },
  tileLabel: { fontSize: fontSize.xs, color: colors.text, fontWeight: fontWeight.medium, textAlign: 'center' },
  tileCount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  tileCountDanger: { color: colors.danger },
  tileChevron: { fontSize: fontSize.md, color: colors.textDim },

  // venues-by-status card
  vbCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  vbHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vbHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  vbHeaderSpacer: { flex: 1 },
  vbTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  vbSub: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 1 },
  vbChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  vbChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surfaceAlt,
  },
  vbChipLg: { paddingVertical: 8, paddingHorizontal: spacing.md, gap: spacing.xs },
  vbDot: { width: 8, height: 8, borderRadius: 4 },
  vbChipLabel: { fontSize: fontSize.xs, color: colors.textMid },
  vbChipLabelZero: { color: colors.textDim },
  vbChipCount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  vbChipCountZero: { color: colors.textDim, fontWeight: fontWeight.medium },
});
