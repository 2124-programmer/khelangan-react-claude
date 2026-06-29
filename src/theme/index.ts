// Centralized design tokens for the whole app.
// Change a value here and it updates everywhere.
import { Platform } from 'react-native';
import { resolveColorScheme } from '../store/themePreference';

/**
 * Light + dark palettes share the SAME keys, so every `colors.x` reference across the app
 * resolves correctly in either theme with no per-screen changes. The active palette is chosen
 * from the OS color scheme at launch (see `colors` below). Because screens bake colors into
 * static `StyleSheet.create`, a theme switch takes effect on the next app launch.
 */
const lightColors = {
  // Brand
  primary: '#0Fae6E',
  primaryDark: '#0A8554',
  primaryLight: '#E4F7EF',

  // Role accents
  player: '#0FAE6E',
  owner: '#2563EB',
  admin: '#7C3AED',

  // Slot states
  slotAvailable: '#0FAE6E',
  slotBooked: '#EF4444',
  slotBlocked: '#9CA3AF',
  slotSelected: '#F59E0B',

  // Status
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#2563EB',

  // Neutrals
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F6',
  border: '#E5E7EB',
  borderDark: '#D1D5DB',

  // Text
  text: '#111827',
  textMid: '#4B5563',
  textDim: '#9CA3AF',
  white: '#FFFFFF',

  // Misc
  star: '#FBBF24',
  overlay: 'rgba(17,24,39,0.55)',
};

const darkColors: typeof lightColors = {
  // Brand — green reads well on dark; soften the "light" tint to a dark-green wash
  primary: '#13B872',
  primaryDark: '#0A8554',
  primaryLight: '#12362A',

  // Role accents — lightened for contrast on dark surfaces
  player: '#13B872',
  owner: '#60A5FA',
  admin: '#A78BFA',

  // Slot states
  slotAvailable: '#13B872',
  slotBooked: '#F87171',
  slotBlocked: '#6B7280',
  slotSelected: '#FBBF24',

  // Status — lightened
  success: '#22C55E',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',

  // Neutrals
  bg: '#0B0F14',
  surface: '#151A21',
  surfaceAlt: '#1F2630',
  border: '#2A323C',
  borderDark: '#3A434F',

  // Text
  text: '#F3F4F6',
  textMid: '#B4BCC6',
  textDim: '#7C8694',
  white: '#FFFFFF', // intentionally pure white — used as the foreground on brand-colored buttons

  // Misc
  star: '#FBBF24',
  overlay: 'rgba(0,0,0,0.6)',
};

/**
 * True when dark mode is active for this launch. Resolved from the saved theme preference
 * (System / Light / Dark) — see `store/themePreference`. The preference is loaded before the app
 * imports (RootGate), so this reads the correct value; changing it reloads the app to repaint.
 */
export const isDark = resolveColorScheme() === 'dark';

/** Active palette, chosen from the resolved scheme at launch. Same keys in light + dark. */
export const colors = isDark ? darkColors : lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/**
 * Inter font families, one per weight (Inter ships discrete weight files). Used by the global
 * font patch in `applyFonts.ts`, which maps each Text/TextInput's `fontWeight` to the matching
 * family so weights render correctly on Android (which doesn't synthesize custom-font weights).
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.4 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  })!,
  modal: Platform.select({
    web: { boxShadow: '0px -2px 16px rgba(0,0,0,0.12)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.5 : 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  })!,
};

export const theme = { colors, spacing, radius, fontSize, fontWeight, fonts, shadow, isDark };
export default theme;
