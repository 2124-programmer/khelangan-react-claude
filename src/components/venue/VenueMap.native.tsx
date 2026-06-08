import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

interface Props {
  lat: number;
  lng: number;
  name: string;
  fullAddress: string;
}

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

export function VenueMap({ lat, lng, name, fullAddress }: Props) {
  const hasCoords = lat !== 0 && lng !== 0;

  const openDirections = () => {
    const url = Platform.select({
      ios: `maps://?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
    });
    Linking.openURL(url!);
  };

  const openAddressSearch = () =>
    Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`);

  // Only render the native MapView when coordinates are available AND a Google Maps
  // API key has been configured (EXPO_PUBLIC_GOOGLE_MAPS_KEY in .env).
  // Without the key in the manifest, PROVIDER_GOOGLE crashes the app on Android.
  if (hasCoords && MAPS_KEY) {
    // Lazily import so the native module is only loaded when actually used.
    const { default: MapView, Marker, PROVIDER_GOOGLE } = require('react-native-maps');
    return (
      <View style={[styles.card, shadow.card]}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} description={fullAddress} />
        </MapView>
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <Text style={styles.venueName} numberOfLines={1}>{name}</Text>
            <Text style={styles.address} numberOfLines={1}>{fullAddress}</Text>
          </View>
          <TouchableOpacity style={styles.btn} onPress={openDirections} activeOpacity={0.8}>
            <Text style={styles.btnText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Static fallback — shown when no coordinates or no Maps API key configured.
  return (
    <View style={[styles.card, shadow.card]}>
      <View style={styles.mapBg}>
        <View style={[styles.grid, { top: '30%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.grid, { top: '60%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.grid, { top: '90%', left: 0, right: 0, height: 1 }]} />
        <View style={[styles.grid, { left: '25%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[styles.grid, { left: '50%', top: 0, bottom: 0, width: 1 }]} />
        <View style={[styles.grid, { left: '75%', top: 0, bottom: 0, width: 1 }]} />
        <View style={styles.pinCircle}>
          <Text style={styles.pinIcon}>📍</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <View style={styles.infoText}>
          <Text style={styles.venueName} numberOfLines={1}>{name}</Text>
          <Text style={styles.address} numberOfLines={2}>{fullAddress}</Text>
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={hasCoords ? openDirections : openAddressSearch}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{hasCoords ? 'Directions' : 'Search'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  map: { height: 180, width: '100%' },

  mapBg: {
    height: 130,
    backgroundColor: '#EAF7F1',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    position: 'absolute',
    backgroundColor: 'rgba(15,174,110,0.08)',
  },
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
