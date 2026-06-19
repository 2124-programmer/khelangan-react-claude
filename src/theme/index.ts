// Centralized design tokens for the whole app.
// Change a value here and it updates everywhere.
import { Platform } from 'react-native';

export const colors = {
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

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  })!,
  modal: Platform.select({
    web: { boxShadow: '0px -2px 16px rgba(0,0,0,0.12)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  })!,
};

export const theme = { colors, spacing, radius, fontSize, fontWeight, shadow };
export default theme;
