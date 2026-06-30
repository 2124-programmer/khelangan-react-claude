import React from 'react';
import { View, StyleSheet, useWindowDimensions, ViewStyle, StyleProp, Platform } from 'react-native';

/**
 * Single source of truth for responsive web/tablet layout. Mobile is unchanged: at phone widths
 * everything resolves to 1 column and the helpers below are pass-throughs, so iOS/Android render
 * exactly as before. Multi-column behaviour is additive at >= tablet width.
 *
 * FIXED column table (do not change without product sign-off):
 *   phone   (< 768px)        -> 1 card / row
 *   tablet  (768 - 1024px)   -> 2 cards / row
 *   desktop (> 1024px)       -> 3 cards / row, inside a centered max-width container
 */

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/** Centered content cap on large screens so the 3-col grid doesn't stretch edge-to-edge. */
export const MAX_CONTENT_WIDTH = 1200;
/** Gutter between grid columns. */
export const GRID_GUTTER = 16;
const HALF_GUTTER = GRID_GUTTER / 2;

export interface Responsive {
  width: number;
  breakpoint: Breakpoint;
  /** 1 / 2 / 3 per the fixed table above. */
  columns: number;
  /** tablet or desktop (i.e. not phone) — multi-column territory. */
  isWide: boolean;
  /** desktop only (> 1024) — where the bottom tab bar becomes a top nav. */
  isDesktop: boolean;
  maxContentWidth: number;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  const breakpoint: Breakpoint = width > 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'phone';
  const columns = breakpoint === 'desktop' ? 3 : breakpoint === 'tablet' ? 2 : 1;
  return {
    width,
    breakpoint,
    columns,
    isWide: breakpoint !== 'phone',
    isDesktop: breakpoint === 'desktop',
    maxContentWidth: MAX_CONTENT_WIDTH,
  };
}

/** Convenience: just the current column count (1/2/3). */
export function useColumns(): number {
  return useResponsive().columns;
}

/**
 * Per-item cell style for a FlatList with `numColumns={columns}`. At 1 column returns undefined
 * (the item keeps its existing wrapper → mobile unchanged); at 2/3 columns it pins the item to a
 * fixed fraction width with a half-gutter so a short last row stays left-aligned (no stretch).
 */
export function gridCellStyle(columns: number): ViewStyle | undefined {
  if (columns <= 1) return undefined;
  return { width: `${100 / columns}%`, paddingHorizontal: HALF_GUTTER };
}

/** contentContainerStyle fragment that centers a list/scroll at the max width on large screens. */
export const centeredContent: ViewStyle = { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' };

/** Web `cursor: pointer` (and nothing on native) — a tiny "this is clickable" affordance for mouse users. */
export const webPointer = Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : null;

/**
 * Hover state for clickable surfaces. `hoverProps` carry RNW's onHoverIn/onHoverOut (no-ops on
 * native, so mobile is unaffected); spread them onto a Touchable/Pressable. Returns `hovered` so
 * the caller can apply a web-only highlight.
 */
export function useHover() {
  const [hovered, setHovered] = React.useState(false);
  const hoverProps: any =
    Platform.OS === 'web'
      ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) }
      : {};
  return { hovered: Platform.OS === 'web' && hovered, hoverProps };
}

/**
 * Centers content at MAX_CONTENT_WIDTH on large screens. On phone the cap never bites and
 * alignSelf:center is a no-op, so the mobile layout is byte-for-byte unchanged.
 */
export function MaxWidthContainer({
  children, style,
}: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.maxWidth, style]}>{children}</View>;
}

/**
 * Responsive grid for the "ScrollView + map" card lists. At 1 column it renders the children
 * straight through (cards keep their own marginBottom → identical to today). At 2/3 columns it
 * lays them out in a flex-wrap row with fixed-fraction widths, so a short final row stays
 * left-aligned at the column width (no stretching) and horizontal gutters are consistent. Vertical
 * rhythm continues to come from each card's existing marginBottom.
 */
export function ResponsiveGrid({
  children, columns, style,
}: { children: React.ReactNode; columns?: number; style?: StyleProp<ViewStyle> }) {
  const auto = useColumns();
  const cols = columns ?? auto;
  const items = React.Children.toArray(children);

  if (cols <= 1) {
    // Phone: untouched single-column stack.
    return <View style={style}>{items}</View>;
  }

  return (
    <View style={[styles.gridRow, style]}>
      {items.map((child, i) => (
        <View key={i} style={[styles.gridCell, { width: `${100 / cols}%` }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  maxWidth: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -HALF_GUTTER },
  gridCell: { paddingHorizontal: HALF_GUTTER },
});
