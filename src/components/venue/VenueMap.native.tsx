import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

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

  const openAddressSearch = () =>
    Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`);

  if (hasCoords) {
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

  // Fallback when no coordinates
  const GRID_COLOR = 'rgba(15,174,110,0.08)';
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
        <TouchableOpacity style={styles.btn} onPress={openAddressSearch} activeOpacity={0.8}>
          <Text style={styles.btnText}>Search</Text>
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
