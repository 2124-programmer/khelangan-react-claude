import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import type { ToastEntry, ToastType } from './types';

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  success: 3000,
  info:    3000,
  warning: 3500,
  error:   4500,
};

const ACCENT: Record<ToastType, string> = {
  success: '#0FAE6E',
  error:   '#D8323A',
  info:    '#2563EB',
  warning: '#D97706',
};

const ACCENT_BG: Record<ToastType, string> = {
  success: '#E4F7EF',
  error:   '#FEE2E2',
  info:    '#DBEAFE',
  warning: '#FEF3C7',
};

// Feather icon names for each type
const ICON_NAME: Record<ToastType, React.ComponentProps<typeof Feather>['name']> = {
  success: 'check-circle',
  error:   'x-circle',
  info:    'info',
  warning: 'alert-triangle',
};

const ITEM_HEIGHT = 64;
export const ITEM_STACK_STEP = ITEM_HEIGHT + 10;

const SWIPE_DISMISS_PX = 70;
const EXIT_MS = 220;

interface Props {
  entry: ToastEntry;
  index: number;
  onDismiss: (id: string) => void;
}

export function ToastItem({ entry, index, onDismiss }: Props) {
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-(ITEM_HEIGHT + 80));
  const translateX = useSharedValue(0);
  const opacity    = useSharedValue(1);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryId    = entry.id;

  function clearTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  function scheduleRemove() {
    timerRef.current = setTimeout(() => onDismiss(entryId), EXIT_MS + 40);
  }

  function dismissAnim() {
    clearTimer();
    opacity.value    = withTiming(0, { duration: EXIT_MS });
    translateY.value = withTiming(-(ITEM_HEIGHT + 80), { duration: EXIT_MS });
    scheduleRemove();
  }

  function dismissSwipe(dx: number) {
    clearTimer();
    opacity.value    = withTiming(0, { duration: EXIT_MS });
    translateX.value = withTiming(dx > 0 ? 500 : -500, { duration: EXIT_MS });
    scheduleRemove();
  }

  function startAutoTimer() {
    clearTimer();
    const ms = entry.duration ?? AUTO_DISMISS_MS[entry.type];
    timerRef.current = setTimeout(dismissAnim, ms);
  }

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 220 });
    startAutoTimer();
    return clearTimer;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dx) > 8,
      onPanResponderGrant: () => { clearTimer(); },
      onPanResponderMove: (_e, gs) => { translateX.value = gs.dx; },
      onPanResponderRelease: (_e, gs) => {
        if (Math.abs(gs.dx) > SWIPE_DISMISS_PX) {
          dismissSwipe(gs.dx);
        } else {
          translateX.value = withSpring(0);
          startAutoTimer();
        }
      },
    })
  ).current;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }));

  const accent   = ACCENT[entry.type];
  const accentBg = ACCENT_BG[entry.type];
  const topOffset = insets.top + spacing.md + index * ITEM_STACK_STEP;

  return (
    <Animated.View
      style={[styles.container, animStyle, { top: topOffset, borderColor: accent, borderWidth: 1.5 }]}
      {...panResponder.panHandlers}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {/* Type icon */}
      <View style={[styles.iconWrap, { backgroundColor: accentBg, borderColor: accent, borderWidth: 1 }]}>
        <Feather name={ICON_NAME[entry.type]} size={22} color={accent} />
      </View>

      {/* Message */}
      <View style={styles.content}>
        {entry.title ? (
          <Text style={styles.title} numberOfLines={1}>{entry.title}</Text>
        ) : null}
        <Text style={styles.message} numberOfLines={4}>{entry.message}</Text>
        {entry.action ? (
          <TouchableOpacity
            onPress={() => { entry.action!.onPress(); dismissAnim(); }}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[styles.actionLabel, { color: accent }]}>{entry.action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={dismissAnim}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        style={styles.closeBtn}
      >
        <Feather name="x" size={16} color={colors.textDim} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const containerShadow = Platform.select({
  web: { boxShadow: '0 8px 32px rgba(0,0,0,0.26)' },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 24,
  },
}) as object;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 99999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...containerShadow,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    paddingRight: 2,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  message: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    lineHeight: 20,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginTop: 4,
  },
  closeBtn: {
    flexShrink: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
