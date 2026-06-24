import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import { PlanBadge } from './PlanBadge';
import type { PlanCode } from '../types';

/**
 * Current → Requested plan comparison. Both badges render in their OWN plan colours — the
 * current-vs-requested distinction is carried by the labels + arrow, never by a blanket colour
 * (this replaces the old hard-coded purple "Requested" treatment).
 */
export function PlanComparison({
  current,
  requested,
  showInfo = false,
}: {
  current: PlanCode | null;
  requested: PlanCode;
  showInfo?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.col}>
        <Text style={styles.label}>Current</Text>
        {current ? (
          <PlanBadge plan={current} showInfo={showInfo} />
        ) : (
          <Text style={styles.none}>None</Text>
        )}
      </View>
      <Feather name="arrow-right" size={18} color={colors.textDim} style={styles.arrow} />
      <View style={styles.col}>
        <Text style={styles.label}>Requested</Text>
        <PlanBadge plan={requested} showInfo={showInfo} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  col: { flex: 1, gap: spacing.xs },
  label: { fontSize: fontSize.xs, color: colors.textDim },
  none: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  arrow: { marginTop: spacing.md },
});
