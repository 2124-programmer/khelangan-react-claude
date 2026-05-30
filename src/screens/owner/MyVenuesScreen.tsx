import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, StatusBadge, StarRating } from '../../components/common';
import { VENUES } from '../../data/mockData';

export default function MyVenuesScreen({ navigation }: any) {
  const myVenues = VENUES.filter((v) => v.ownerId === 'o1');

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Venues" rightLabel="+ Add" onRightPress={() => navigation.navigate('AddVenue')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {myVenues.map((v) => (
          <View key={v.id} style={[styles.card, shadow.card]}>
            <Image source={{ uri: v.coverPhoto }} style={styles.img} />
            <View style={styles.body}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={styles.name}>{v.name}</Text>
                <StatusBadge status={v.status} />
              </View>
              <Text style={styles.addr}>📍 {v.address}</Text>
              <View style={styles.metaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <StarRating value={Math.round(v.rating)} size={13} />
                  <Text style={styles.meta}>{v.rating} ({v.reviewCount})</Text>
                </View>
                <Text style={styles.meta}>{v.courts.length} courts</Text>
              </View>
              <View style={styles.actions}>
                <AppButton label="Calendar" variant="secondary" fullWidth={false} onPress={() => navigation.navigate('VenueCalendar', { venueId: v.id })} style={{ flex: 1, height: 40 }} />
                <AppButton label="Edit" variant="ghost" fullWidth={false} onPress={() => navigation.navigate('EditVenue', { venueId: v.id })} style={{ flex: 1, height: 40 }} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  img: { width: '100%', height: 130, backgroundColor: colors.surfaceAlt },
  body: { padding: spacing.lg },
  name: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  addr: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  meta: { fontSize: fontSize.xs, color: colors.textMid },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
