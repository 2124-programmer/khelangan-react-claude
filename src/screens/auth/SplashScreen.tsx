import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';
import { AppButton } from '../../components/common';
import { useAuth } from '../../store/AuthContext';

// In a real app this would auto-route based on a stored token.
// For the demo it lets you pick a role to explore each flow.
export default function SplashScreen({ navigation }: any) {
  const { login } = useAuth();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>⚽</Text>
        <Text style={styles.title}>TurfBook</Text>
        <Text style={styles.subtitle}>Book sports turfs near you, instantly.</Text>
      </View>
      <View style={styles.actions}>
        <Text style={styles.pickLabel}>DEMO — CHOOSE A ROLE TO EXPLORE</Text>
        <AppButton label="Continue as Player" icon="👤" onPress={() => login('player')} />
        <View style={{ height: spacing.md }} />
        <AppButton label="Continue as Venue Owner" icon="🏟" variant="secondary" onPress={() => login('owner')} />
        <View style={{ height: spacing.md }} />
        <AppButton label="Continue as Admin" icon="⚙️" variant="ghost" onPress={() => login('admin')} />
        <View style={{ height: spacing.xl }} />
        <AppButton label="Go to Login Screen" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'space-between', padding: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 72 },
  title: { fontSize: 44, fontWeight: fontWeight.bold, color: colors.white, marginTop: spacing.md },
  subtitle: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm },
  actions: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  pickLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textDim, letterSpacing: 1, textAlign: 'center', marginBottom: spacing.lg },
});
