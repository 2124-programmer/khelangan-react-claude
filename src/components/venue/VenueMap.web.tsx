import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

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
    <View style={styles.placeholder}>
      <Text style={styles.placeholderEmoji}>🗺️</Text>
      <Text style={styles.placeholderText}>{fullAddress}</Text>
      <TouchableOpacity onPress={() => Linking.openURL(mapsUrl)}>
        <Text style={styles.link}>
          {hasCoords ? '📍 Open in Google Maps →' : 'Search on Google Maps →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 120,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  placeholderEmoji: { fontSize: 32 },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textMid,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  link: { fontSize: fontSize.sm, color: colors.primary, marginTop: spacing.sm },
});
