import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import Animated, {
  useSharedValue, useAnimatedProps, withRepeat, withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import type { SubscriptionTimeline as Timeline, Subscription } from '../../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ROW_Y = 16;          // vertical center of the node row inside the SVG
const SVG_HEIGHT = 34;

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** A soft lime halo that pulses around the single LIVE node. */
function LivePulse({ cx }: { cx: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    return () => cancelAnimation(progress);
  }, [progress]);
  const animatedProps = useAnimatedProps(() => ({
    r: 9 + progress.value * 11,
    opacity: 0.35 * (1 - progress.value),
  }));
  return <AnimatedCircle cx={cx} cy={ROW_Y} fill={colors.primary} animatedProps={animatedProps} />;
}

/**
 * Horizontal lifecycle stepper: Registered → Approved → Trial activated → Subscription.
 * Driven entirely by the API timeline payload — exactly one node is LIVE.
 */
export function SubscriptionTimeline({ timeline }: { timeline: Timeline }) {
  const [width, setWidth] = useState(0);
  const stages = timeline.stages ?? [];
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const n = stages.length;
  const step = n > 0 ? width / n : 0;
  const centerX = (i: number) => step * (i + 0.5);
  const liveIdx = stages.findIndex((s) => s.state === 'LIVE');

  return (
    <View onLayout={onLayout}>
      {width > 0 && n > 0 && (
        <Svg width={width} height={SVG_HEIGHT}>
          {/* Connectors: solid navy up to & including the live node, dashed grey after. */}
          {stages.slice(0, -1).map((_, i) => {
            const reached = liveIdx === -1 ? false : i < liveIdx;
            return (
              <Line
                key={`seg-${i}`}
                x1={centerX(i)}
                y1={ROW_Y}
                x2={centerX(i + 1)}
                y2={ROW_Y}
                stroke={reached ? colors.admin : colors.borderDark}
                strokeWidth={2}
                strokeDasharray={reached ? undefined : '4 4'}
              />
            );
          })}
          {/* Nodes */}
          {stages.map((s, i) => {
            if (s.state === 'LIVE') {
              return (
                <React.Fragment key={`node-${i}`}>
                  <LivePulse cx={centerX(i)} />
                  <Circle cx={centerX(i)} cy={ROW_Y} r={9} fill={colors.primary} stroke={colors.white} strokeWidth={2} />
                </React.Fragment>
              );
            }
            const completed = s.state === 'COMPLETED';
            return (
              <Circle
                key={`node-${i}`}
                cx={centerX(i)}
                cy={ROW_Y}
                r={7}
                fill={completed ? colors.admin : colors.white}
                stroke={completed ? colors.admin : colors.borderDark}
                strokeWidth={2}
              />
            );
          })}
        </Svg>
      )}

      {/* Labels + dates, one column per node */}
      <View style={styles.labelRow}>
        {stages.map((s, i) => (
          <View key={`label-${i}`} style={styles.labelCol}>
            <Text
              style={[styles.label, s.state === 'LIVE' && styles.labelLive]}
              numberOfLines={2}
            >
              {s.label}
            </Text>
            {s.state === 'LIVE' && (
              <View style={styles.livePill}><Text style={styles.livePillText}>LIVE</Text></View>
            )}
            <Text style={styles.date}>{fmtDate(s.occurredAt)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Compact "recent subscriptions" strip beneath the stepper (max 3, newest first). */
export function RecentSubscriptionsStrip({ items }: { items: Subscription[] }) {
  const recent = items.slice(0, 3);
  if (recent.length === 0) return null;
  return (
    <View style={styles.recentWrap}>
      {recent.map((s) => (
        <View key={s.id} style={styles.recentRow}>
          <View style={styles.recentDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.recentPlan}>{s.planName}</Text>
            <Text style={styles.recentMeta}>
              {fmtDate(s.periodStart)} → {fmtDate(s.periodEnd)} · ₹{s.price.toLocaleString('en-IN')}
            </Text>
          </View>
          <Text style={[styles.recentStatus, { color: statusColor(s.status) }]}>{s.status}</Text>
        </View>
      ))}
    </View>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case 'ACTIVE': return colors.success;
    case 'TRIALING': return colors.info;
    case 'PAST_DUE': return colors.warning;
    case 'EXPIRED': return colors.danger;
    default: return colors.textDim;
  }
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', marginTop: spacing.xs },
  labelCol: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  label: { fontSize: fontSize.xs, color: colors.textMid, textAlign: 'center' },
  labelLive: { color: colors.text, fontWeight: fontWeight.bold },
  livePill: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1, marginTop: 2 },
  livePillText: { fontSize: 8, fontWeight: fontWeight.bold, color: colors.white },
  date: { fontSize: 9, color: colors.textDim, marginTop: 2, textAlign: 'center' },
  recentWrap: { marginTop: spacing.md, gap: spacing.sm },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.admin },
  recentPlan: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  recentMeta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  recentStatus: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
