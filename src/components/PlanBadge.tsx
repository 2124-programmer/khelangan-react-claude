import React, { useState } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { radius, fontWeight } from '../theme';
import { usePlanMeta } from '../theme/planMeta';
import type { PlanCode } from '../types';
import { PlanInfoSheet } from './PlanInfoSheet';

export type PlanBadgeSize = 'sm' | 'md';
export type PlanBadgeVariant = 'soft' | 'solid' | 'outline';

export interface PlanBadgeProps {
  plan: PlanCode;
  size?: PlanBadgeSize;
  variant?: PlanBadgeVariant;
  /** Render a separate info button that opens the plan details sheet. */
  showInfo?: boolean;
  /** Makes the whole name area tappable (e.g. a plan picker). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable, role-agnostic plan chip. Colour comes from the plan's own palette in `planMeta`
 * (distinct from subscription-status colour, which stays on the separate StatusPill). Never put
 * status text inside this badge.
 */
export function PlanBadge({
  plan,
  size = 'md',
  variant = 'soft',
  showInfo = false,
  onPress,
  style,
}: PlanBadgeProps) {
  const meta = usePlanMeta(plan);
  const [infoOpen, setInfoOpen] = useState(false);

  const sz = size === 'sm' ? SIZES.sm : SIZES.md;
  const pill =
    variant === 'solid'
      ? { backgroundColor: meta.text }
      : variant === 'outline'
        ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: meta.text }
        : { backgroundColor: meta.bg };
  const textColor = variant === 'solid' ? meta.bg : meta.text;

  const NameWrap: React.ElementType = onPress ? TouchableOpacity : View;
  const nameProps = onPress
    ? { onPress, activeOpacity: 0.7, accessibilityRole: 'button' as const }
    : {};

  return (
    <View style={[styles.row, style]}>
      <NameWrap
        {...nameProps}
        style={[styles.pill, pill, { paddingHorizontal: sz.padH, paddingVertical: sz.padV }]}
        accessibilityLabel={`${meta.name} plan`}
      >
        <Text style={[styles.name, { color: textColor, fontSize: sz.font }]} numberOfLines={1}>
          {meta.name}
        </Text>
      </NameWrap>

      {showInfo ? (
        <>
          <TouchableOpacity
            onPress={() => setInfoOpen(true)}
            style={styles.infoBtn}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`${meta.name} plan details`}
          >
            <Feather name="info" size={size === 'sm' ? 13 : 15} color={meta.text} />
          </TouchableOpacity>
          <PlanInfoSheet plan={plan} visible={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
      ) : null}
    </View>
  );
}

const SIZES = {
  sm: { font: 11, padH: 8, padV: 2 },
  md: { font: 13, padH: 12, padV: 4 },
} as const;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  pill: { borderRadius: radius.pill, alignSelf: 'flex-start' },
  name: { fontWeight: fontWeight.medium },
  // Separate ≥44×44 tap target for the info button.
  infoBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
});
