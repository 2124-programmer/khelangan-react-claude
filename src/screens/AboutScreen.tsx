import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { centeredContent } from '../responsive';
import { toast } from '../toast';

/**
 * App "About" screen — works the same whether signed in or not (no authed calls), so it can be
 * mounted as a guest bottom-tab AND reached from each role's Settings menu. Shows the live app
 * version/build, legal links, support contact and credits.
 *
 * NOTE: point these at the real hosted pages before release (the legal links must resolve for
 * store review / DPDP compliance). They live here as the single source of truth.
 */
const SUPPORT_EMAIL = 'score.addda@gmail.com';
const WEBSITE_URL = 'https://score-adda.online';

const CURRENT_YEAR = 2026; // bump as needed; Date.* is avoided so the value is deterministic.

function appVersion(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : Platform.OS === 'android'
        ? (Constants.expoConfig?.android?.versionCode != null
            ? String(Constants.expoConfig.android.versionCode)
            : undefined)
        : undefined;
  return build ? `Version ${version} (build ${build})` : `Version ${version}`;
}

async function openUrl(url: string, fallbackMsg: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else toast.info(fallbackMsg);
  } catch {
    toast.info(fallbackMsg);
  }
}

function LinkRow({
  icon, label, sublabel, onPress,
}: { icon: React.ComponentProps<typeof Feather>['name']; label: string; sublabel?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={styles.rowIcon}><Feather name={icon} size={18} color={colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
      </View>
      <Feather name="chevron-right" size={18} color={colors.textDim} />
    </TouchableOpacity>
  );
}

export default function AboutScreen({ navigation }: any) {
  const canBack = navigation?.canGoBack?.() ?? false;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Lightweight header — no NotificationBell, so it's safe for logged-out guests.
          Full-width bar with the row capped to the content band so the back button aligns with content on web. */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          {canBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityLabel="Back">
              <Text style={styles.headerBack}>‹</Text>
            </TouchableOpacity>
          ) : <View style={styles.headerBtn} />}
          <Text style={styles.headerTitle}>About</Text>
          <View style={styles.headerBtn} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl, ...centeredContent }}>
        {/* Brand + version */}
        <View style={styles.brand}>
          <Image
            source={require('../../assets/logo/score-adda-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Multi-sport turf &amp; court booking</Text>
          <View style={styles.versionPill}>
            <Text style={styles.versionText}>{appVersion()}</Text>
          </View>
        </View>

        {/* Learn */}
        <Text style={styles.sectionTitle}>Score-Adda</Text>
        <View style={styles.card}>
          <LinkRow
            icon="compass"
            label="How it works"
            sublabel="What we handle for players & owners"
            onPress={() => navigation.navigate('HowItWorks')}
          />
        </View>

        {/* Legal */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <LinkRow
            icon="file-text"
            label="Terms of Service"
            onPress={() => navigation.navigate('Terms')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="shield"
            label="Privacy Policy"
            onPress={() => navigation.navigate('Privacy')}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.card}>
          <LinkRow
            icon="mail"
            label="Contact Support"
            sublabel={SUPPORT_EMAIL}
            onPress={() => openUrl(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Score-Adda support request')}`,
              `Email us at ${SUPPORT_EMAIL}`,
            )}
          />
          <View style={styles.divider} />
          <LinkRow
            icon="globe"
            label="Website"
            sublabel={WEBSITE_URL.replace(/^https?:\/\//, '')}
            onPress={() => openUrl(WEBSITE_URL, `Visit ${WEBSITE_URL}`)}
          />
        </View>

        {/* Credits */}
        <Text style={styles.copyright}>© {CURRENT_YEAR} Khelangan · Score-Adda</Text>
        <Text style={styles.madeIn}>Made with ♥ in India</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    width: '100%', maxWidth: 1200, alignSelf: 'center',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerBack: { fontSize: 30, color: colors.text, marginTop: -2 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

  brand: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xl },
  logo: { width: 180, height: 64, marginBottom: spacing.sm },
  tagline: { fontSize: fontSize.sm, color: colors.textMid, marginBottom: spacing.md },
  versionPill: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  versionText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMid },

  sectionTitle: {
    fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMid,
    marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  rowLabel: { fontSize: fontSize.md, color: colors.text, fontWeight: fontWeight.medium },
  rowSub: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 56 },

  copyright: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xxl },
  madeIn: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textDim, marginTop: 2 },
});
