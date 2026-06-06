import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

interface Props {
  lat: number;
  lng: number;
  name: string;
  fullAddress: string;
}

export function VenueMap({ lat, lng, name, fullAddress }: Props) {
  const hasCoords = lat !== 0 && lng !== 0;
  const mapsUrl = hasCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`;

  return (
    <View style={[styles.card, shadow.card]}>
      {/* Map-like header */}
      <View style={styles.mapBg}>
        <View style={styles.gridH1} /><View style={styles.gridH2} /><View style={styles.gridH3} />
        <View style={styles.gridV1} /><View style={styles.gridV2} /><View style={styles.gridV3} />
        <View style={styles.pinWrap}>
          <View style={styles.pinCircle}>
            <Text style={styles.pinIcon}>📍</Text>
          </View>
        </View>
      </View>

      {/* Address info */}
      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <Text style={styles.venueName} numberOfLines={1}>{name}</Text>
          <Text style={styles.address} numberOfLines={2}>{fullAddress}</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(mapsUrl)} activeOpacity={0.8}>
          <Text style={styles.btnText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const GRID_COLOR = 'rgba(15,174,110,0.08)';

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },

  // Decorative map-grid background
  mapBg: {
    height: 130,
    backgroundColor: '#EAF7F1',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridH1: { position: 'absolute', left: 0, right: 0, top: '30%', height: 1, backgroundColor: GRID_COLOR },
  gridH2: { position: 'absolute', left: 0, right: 0, top: '60%', height: 1, backgroundColor: GRID_COLOR },
  gridH3: { position: 'absolute', left: 0, right: 0, top: '90%', height: 1, backgroundColor: GRID_COLOR },
  gridV1: { position: 'absolute', top: 0, bottom: 0, left: '25%', width: 1, backgroundColor: GRID_COLOR },
  gridV2: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: GRID_COLOR },
  gridV3: { position: 'absolute', top: 0, bottom: 0, left: '75%', width: 1, backgroundColor: GRID_COLOR },
  pinWrap: { alignItems: 'center', justifyContent: 'center' },
  pinCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  pinIcon: { fontSize: 26 },

  // Bottom info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoText: { flex: 1 },
  venueName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  address: {
    fontSize: fontSize.xs,
    color: colors.textMid,
    lineHeight: 16,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  btnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
