import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

interface Props {
  lat: number;
  lng: number;
  name: string;
  fullAddress: string;
}

export function VenueMap({ lat, lng, name, fullAddress }: Props) {
  const hasCoords = lat !== 0 && lng !== 0;

  const openDirections = () => {
    const url = Platform.select({
      ios: `maps://?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
    });
    Linking.openURL(url!);
  };

  if (!hasCoords) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderEmoji}>🗺️</Text>
        <Text style={styles.placeholderText}>{fullAddress}</Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`)
          }
        >
          <Text style={styles.link}>Search on Google Maps →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      <TouchableOpacity style={styles.directionsBtn} onPress={openDirections} activeOpacity={0.8}>
        <Text style={styles.directionsBtnText}>📍 Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: { height: 180, width: '100%' },
  directionsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  directionsBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
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
