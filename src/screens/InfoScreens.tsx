import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../theme';
import { centeredContent } from '../responsive';

/**
 * Static information / legal pages reachable from the About screen (guest + all roles).
 * No authenticated calls, so they render the same signed-in or out.
 *
 * NOTE: the Terms & Privacy copy below is a structured starting point that reflects how
 * Score-Adda actually works (the platform never holds booking payments — venues are paid
 * directly). Have it reviewed by legal/DPDP counsel before publishing to the stores.
 */

const SUPPORT_EMAIL = 'score.addda@gmail.com';
const LAST_UPDATED = 'June 2026';

/* ── Shared building blocks ──────────────────────────────────────────────── */

function InfoHeader({ title, navigation }: { title: string; navigation: any }) {
  const canBack = navigation?.canGoBack?.() ?? false;
  return (
    <View style={styles.header}>
      <View style={styles.headerInner}>
        {canBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityLabel="Back">
            <Text style={styles.headerBack}>‹</Text>
          </TouchableOpacity>
        ) : <View style={styles.headerBtn} />}
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerBtn} />
      </View>
    </View>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h}>{children}</Text>;
}
function P({ children }: { children: React.ReactNode }) {
  return <Text style={styles.p}>{children}</Text>;
}
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

/* ── Terms of Service ────────────────────────────────────────────────────── */

export function TermsScreen({ navigation }: any) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <InfoHeader title="Terms of Service" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.body, centeredContent]}>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <P>
          Welcome to Score-Adda. These Terms govern your use of the Score-Adda app and services
          (the “Platform”). By creating an account or using the Platform, you agree to these Terms.
        </P>

        <H>1. What Score-Adda does</H>
        <P>
          Score-Adda is a discovery and booking platform that connects players with sports venues
          (turfs and courts). We help you find venues, view availability and reserve slots. Venues
          are independently owned and operated.
        </P>

        <H>2. Accounts</H>
        <Bullet>You must provide accurate details and keep your login secure.</Bullet>
        <Bullet>You’re responsible for activity on your account.</Bullet>
        <Bullet>One email and one phone number may be linked to a single active account.</Bullet>

        <H>3. Bookings</H>
        <P>
          A confirmed booking reserves a court for the selected date and time. Some venues require
          owner approval, in which case the slot stays pending until the venue confirms.
        </P>

        <H>4. Payments &amp; refunds</H>
        <P>
          Score-Adda does not collect, hold or process your booking payment. You pay the venue
          directly as per its accepted methods. Any refund is therefore handled by the venue under
          its own policy. If an issue isn’t resolved with the venue, you can raise a dispute and our
          team will help mediate.
        </P>

        <H>5. Cancellations</H>
        <P>
          Whether a booking can be cancelled, and any cancellation window, depends on the venue’s
          policy shown on the booking. Cancelling frees the slot for others.
        </P>

        <H>6. Acceptable use</H>
        <Bullet>Don’t misuse the Platform, attempt fraud, or disrupt other users.</Bullet>
        <Bullet>Don’t post unlawful, abusive or infringing content in reviews or messages.</Bullet>
        <Bullet>Venue owners must list accurate details, pricing and availability.</Bullet>

        <H>7. Reviews</H>
        <P>
          Reviews should reflect genuine experiences. We may remove content that is fake, abusive or
          violates these Terms.
        </P>

        <H>8. Liability</H>
        <P>
          The Platform is provided “as is”. Score-Adda is not responsible for the condition of a
          venue, the conduct of users, or disputes between players and venues, but we will make
          reasonable efforts to help resolve issues.
        </P>

        <H>9. Changes</H>
        <P>
          We may update these Terms from time to time. Continued use after an update means you accept
          the revised Terms.
        </P>

        <H>10. Contact</H>
        <P>Questions about these Terms? Email us at {SUPPORT_EMAIL}.</P>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Privacy Policy ──────────────────────────────────────────────────────── */

export function PrivacyPolicyScreen({ navigation }: any) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <InfoHeader title="Privacy Policy" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.body, centeredContent]}>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>

        <P>
          This Policy explains what information Score-Adda collects, how we use it, and the choices
          you have. We follow the principles of India’s Digital Personal Data Protection (DPDP) Act.
        </P>

        <H>1. Information we collect</H>
        <Bullet>Account details: name, email, phone number and password (stored encrypted).</Bullet>
        <Bullet>Booking data: venues, courts, dates and slots you book.</Bullet>
        <Bullet>Location: used only to show nearby venues and distance, with your permission.</Bullet>
        <Bullet>Device data: push token and basic diagnostics to deliver notifications.</Bullet>

        <H>2. How we use it</H>
        <Bullet>To create your account and process bookings.</Bullet>
        <Bullet>To show relevant venues and send booking updates &amp; reminders.</Bullet>
        <Bullet>To provide support and resolve disputes.</Bullet>
        <Bullet>To keep the Platform secure and prevent abuse.</Bullet>

        <H>3. What we share</H>
        <P>
          When you book, the necessary booking details are shared with that venue so it can host you.
          We do not sell your personal data. We don’t process your payment, so we don’t store card or
          bank details.
        </P>

        <H>4. Your choices &amp; rights</H>
        <Bullet>Access and update your profile any time in the app.</Bullet>
        <Bullet>Turn push and email notifications on or off in Settings.</Bullet>
        <Bullet>Delete your account from Settings → Delete Account; your email and phone are then freed for reuse.</Bullet>

        <H>5. Data retention</H>
        <P>
          We keep your data while your account is active. When you delete your account, identifying
          details are removed or anonymised, except where we must retain records for legal or
          dispute-resolution purposes.
        </P>

        <H>6. Security</H>
        <P>
          We use industry-standard measures (encrypted passwords, secure transport) to protect your
          data. No method is 100% secure, but we work to safeguard your information.
        </P>

        <H>7. Contact</H>
        <P>For privacy questions or data requests, email {SUPPORT_EMAIL}.</P>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── How It Works ────────────────────────────────────────────────────────── */

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}><Text style={styles.stepNumText}>{n}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

export function HowItWorksScreen({ navigation }: any) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <InfoHeader title="How It Works" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.body, centeredContent]}>
        <P>
          Score-Adda takes care of the whole journey — for players who want to book and play, and for
          venue owners who want to fill their courts. Here’s what we handle on each side.
        </P>

        {/* Players */}
        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>🏃 For Players</Text>
          <Step n={1} title="Discover venues nearby" desc="Search by sport and city, see live availability, prices and reviews." />
          <Step n={2} title="Pick a court & time" desc="Choose a court and one or more adjacent time slots that suit you." />
          <Step n={3} title="Book instantly" desc="Confirm your slot — or send a request if the venue approves bookings. You pay the venue directly." />
          <Step n={4} title="Play & rate" desc="Get reminders, show up and play, then rate your experience." />
          <View style={styles.example}>
            <Text style={styles.exampleLabel}>Example</Text>
            <Text style={styles.exampleText}>
              Rahul searches “5-a-side football in Nashik”, picks Green Turf for 7–8 PM, books the
              slot, gets a confirmation + reminder, pays at the venue, and plays. Afterwards he leaves
              a 5★ review.
            </Text>
          </View>
        </View>

        {/* Owners */}
        <View style={styles.roleCard}>
          <Text style={styles.roleTitle}>🏟 For Venue Owners</Text>
          <Step n={1} title="List your venue & courts" desc="Add your venue, courts, photos, timings and pricing in a few steps." />
          <Step n={2} title="Get approved & go live" desc="Our team reviews and approves your venue; start a free trial or plan to make courts bookable." />
          <Step n={3} title="Receive & manage bookings" desc="Accept or auto-accept bookings, check players in, and handle cancellations from one place." />
          <Step n={4} title="Track earnings & grow" desc="See bookings and earnings on your dashboard, run offers, and build your reviews." />
          <View style={styles.example}>
            <Text style={styles.exampleLabel}>Example</Text>
            <Text style={styles.exampleText}>
              Priya lists “Green Turf” with 2 courts, gets approved, starts a trial to go live, then
              receives Rahul’s booking, checks him in on match day, and watches her earnings update on
              the dashboard.
            </Text>
          </View>
        </View>

        <Text style={styles.footnote}>
          Note: Score-Adda connects players and venues. Payments are made directly to the venue, so
          refunds and on-ground arrangements are handled by the venue — with our support if a dispute
          comes up.
        </Text>

        <View style={{ height: spacing.xxl }} />
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

  body: { padding: spacing.lg },
  updated: { fontSize: fontSize.xs, color: colors.textDim, marginBottom: spacing.md },

  h: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  p: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 21, marginBottom: spacing.xs },

  bulletRow: { flexDirection: 'row', marginTop: 4, paddingRight: spacing.sm },
  bulletDot: { fontSize: fontSize.sm, color: colors.primary, marginRight: spacing.sm, lineHeight: 21 },
  bulletText: { flex: 1, fontSize: fontSize.sm, color: colors.textMid, lineHeight: 21 },

  // How It Works
  roleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginTop: spacing.lg,
  },
  roleTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stepNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: '#fff', fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  stepTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  stepDesc: { fontSize: fontSize.xs, color: colors.textMid, lineHeight: 18, marginTop: 1 },
  example: {
    backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  exampleLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.primary, marginBottom: 2 },
  exampleText: { fontSize: fontSize.xs, color: colors.textMid, lineHeight: 18 },
  footnote: { fontSize: fontSize.xs, color: colors.textDim, lineHeight: 18, marginTop: spacing.lg, fontStyle: 'italic' },
});
