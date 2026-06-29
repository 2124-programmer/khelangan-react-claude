import React from 'react';
import { Text, TextInput, StyleSheet, Platform } from 'react-native';

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
  // Web: browsers synthesize weights from a single family, and react-native-web resolves `style`
  // to className strings — re-wrapping those in the render patch crashes RNW ("Failed to set an
  // indexed property [0] on CSSStyleDeclaration", e.g. on vector-icon spans). So on web we set the
  // default font via global CSS and never monkey-patch RNW's Text/TextInput render.
  if (Platform.OS === 'web') {
    injectWebFontCss();
    return;
  }
  patch(Text as unknown as { render?: (...a: unknown[]) => React.ReactElement | null });
  patch(TextInput as unknown as { render?: (...a: unknown[]) => React.ReactElement | null });
}

/**
 * Web only: make Inter the default font via a global stylesheet. Inherited by all text, so elements
 * that don't set their own `fontFamily` render in Inter (with the browser synthesizing weights from
 * `fontWeight`). Elements with an explicit inline `fontFamily` — e.g. @expo/vector-icons glyphs —
 * keep theirs, since inline styles beat stylesheet rules.
 */
function injectWebFontCss(): void {
  if (typeof document === 'undefined') return;
  const id = 'inter-global-font';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  // Low-specificity, inheritance-driven: form controls don't inherit font by default so list them
  // explicitly; everything else inherits from #root. Avoids overriding any element (e.g. icon
  // glyphs) that sets its own font-family via a class.
  style.textContent =
    "body, #root, input, textarea, button, select {"
    + " font-family: 'Inter_400Regular', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }";
  document.head.appendChild(style);
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
