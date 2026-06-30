import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, spacing, fontSize, fontWeight } from '../theme';
import { useResponsive, MAX_CONTENT_WIDTH } from '../responsive';

/** Height of the desktop top nav bar; navigators pad their scene by this on desktop. */
export const TOPNAV_HEIGHT = 60;

/**
 * Swaps navigation chrome by width WITHOUT forking the navigators:
 *   • phone / tablet (<= 1024px) → the stock bottom tab bar (mobile is byte-for-byte unchanged)
 *   • desktop (> 1024px)        → a centered top nav bar (bottom tabs look wrong on wide web)
 *
 * Drop in via `tabBar={(props) => <ResponsiveTabBar {...props} />}` on any bottom-tab navigator.
 */
export default function ResponsiveTabBar(props: BottomTabBarProps) {
  const { isDesktop } = useResponsive();
  if (!isDesktop) return <BottomTabBar {...props} />;
  return <TopNavBar {...props} />;
}

function TopNavBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Image
          source={require('../../assets/logo/score-adda-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.items}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string' ? options.tabBarLabel
                : options.title ?? route.name;
            const activeTint = (options.tabBarActiveTintColor as string) ?? colors.primary;
            const inactiveTint = (options.tabBarInactiveTintColor as string) ?? colors.textMid;
            const color = focused ? activeTint : inactiveTint;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                style={[styles.item, focused && { backgroundColor: activeTint + '14' }]}
              >
                {options.tabBarIcon?.({ focused, color, size: 18 })}
                <Text style={[styles.itemLabel, { color }]} numberOfLines={1}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: TOPNAV_HEIGHT, zIndex: 50,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    ...(Platform.OS === 'web' ? { boxShadow: '0 1px 8px rgba(0,0,0,0.06)' } as object : null),
  },
  inner: {
    flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  logo: { width: 132, height: 36 },
  items: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as object : null),
  },
  itemLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
