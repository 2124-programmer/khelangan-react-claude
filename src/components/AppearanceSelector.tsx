import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme';
import { ConfirmActionModal } from '../modals';
import { getThemePref, setThemePref, ThemePref } from '../store/themePreference';
import { reloadApp } from '../theme/reloadApp';

const OPTIONS: { value: ThemePref; label: string; desc: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'system', label: 'System', desc: 'Match your device setting', icon: 'smartphone' },
  { value: 'light', label: 'Light', desc: 'Always light', icon: 'sun' },
  { value: 'dark', label: 'Dark', desc: 'Always dark', icon: 'moon' },
];

/**
 * Light / Dark / System theme picker. Selecting a new option persists the preference and reloads
 * the app so every static style repaints with the new palette. Drop it into any settings/profile
 * screen.
 */
export function AppearanceSelector() {
  const [current, setCurrent] = useState<ThemePref>(getThemePref());
  const [pending, setPending] = useState<ThemePref | null>(null);

  const apply = async () => {
    if (!pending) return;
    const next = pending;
    setPending(null);
    setCurrent(next);
    await setThemePref(next);
    await reloadApp();
  };

  return (
    <View>
      <Text style={s.heading}>Appearance</Text>
      <View style={[s.card, shadow.card]}>
        {OPTIONS.map((o, i) => {
          const active = current === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              style={[s.row, i > 0 && s.rowDivider]}
              activeOpacity={0.8}
              onPress={() => { if (o.value !== current) setPending(o.value); }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={s.iconBox}>
                <Feather name={o.icon} size={18} color={active ? colors.primary : colors.textMid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{o.label}</Text>
                <Text style={s.desc}>{o.desc}</Text>
              </View>
              {active && <Feather name="check" size={18} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ConfirmActionModal
        visible={!!pending}
        title="Apply theme?"
        message="The app will reload to apply the new theme."
        confirmLabel="Apply & reload"
        onConfirm={apply}
        onDismiss={() => setPending(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  heading: {
    fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold,
    textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.xs,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconBox: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  desc: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
});
