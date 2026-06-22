import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import type { VenueSubscriptionBadge } from '../types';

const TERMINAL = ['PAST_DUE', 'EXPIRED', 'CANCELED', 'VOIDED'];

function planLabel(badge: VenueSubscriptionBadge): string {
  if (badge.status === 'TRIALING') return 'Trial';
  if (badge.planName) return badge.planName;
  return badge.planCode || 'Plan';
}

/**
 * Compact plan + remaining-days chip. Green when healthy, amber when expiring soon,
 * red when lapsed/expired. Tappable → the current-plan screen.
 */
export function SubscriptionBadge({
  badge,
  onPress,
}: {
  badge: VenueSubscriptionBadge;
  onPress?: () => void;
}) {
  const lapsed = TERMINAL.includes(badge.status);
  const tone = lapsed ? 'red' : badge.expiringSoon ? 'amber' : 'green';
  const palette = {
    green: { bg: '#DCFCE7', fg: '#15803D' },
    amber: { bg: '#FEF3C7', fg: '#B45309' },
    red: { bg: '#FEE2E2', fg: '#B91C1C' },
  }[tone];

  const right = lapsed
    ? badge.status === 'EXPIRED' || badge.status === 'CANCELED' || badge.status === 'VOIDED'
      ? 'Renew'
      : `${badge.remainingDays}d grace`
    : `${badge.remainingDays}d left`;

  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      style={[styles.badge, { backgroundColor: palette.bg }]}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={1}>
        {planLabel(badge)} · {right}
      </Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
