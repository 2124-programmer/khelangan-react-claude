import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';

/**
 * Global Inter font application.
 *
 * The app sets weights via `fontWeight` (e.g. `fontWeight: '700'`) in hundreds of static styles.
 * Custom fonts on Android don't synthesize weights — each weight is a separate family — so a single
 * default family would render everything at regular weight. This patches `Text`/`TextInput` render
 * to map each element's resolved `fontWeight` to the matching Inter family, app-wide, with zero
 * per-screen changes. An explicit `fontFamily` in a style still wins (e.g. the monospace debug line).
 */
const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_700Bold',
  '900': 'Inter_700Bold',
};

let applied = false;

export function applyInterFont(): void {
  if (applied) return;
  applied = true;
  patch(Text as unknown as { render?: (...a: unknown[]) => React.ReactElement | null });
  patch(TextInput as unknown as { render?: (...a: unknown[]) => React.ReactElement | null });
}

function patch(Comp: { render?: (...a: unknown[]) => React.ReactElement | null }): void {
  const original = Comp.render;
  if (typeof original !== 'function') return;
  Comp.render = function patchedRender(this: unknown, ...args: unknown[]) {
    const element = original.apply(this, args);
    if (!element) return element;
    const props = (element.props ?? {}) as { style?: unknown };
    const flat = (StyleSheet.flatten(props.style) ?? {}) as { fontWeight?: unknown; fontFamily?: string };
    const weightKey = flat.fontWeight != null ? String(flat.fontWeight) : '400';
    const family = flat.fontFamily ?? FAMILY_BY_WEIGHT[weightKey] ?? 'Inter_400Regular';
    // Our family first (lowest precedence), the element's own style next (so explicit fontFamily
    // wins), then strip fontWeight so the platform relies on the family alone for weight.
    return React.cloneElement(element, {
      style: [{ fontFamily: family }, props.style, { fontWeight: undefined }],
    });
  };
}
