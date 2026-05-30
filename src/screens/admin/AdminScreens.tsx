import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppHeader, AppButton, AppInput, StatusBadge, StatCard, Card, EmptyState, AvatarImage,
} from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import {
  PENDING_VENUES, VENUES, BOOKINGS, PAYOUTS, DISPUTES, COUPONS, SPORTS, ADMIN_KPIS,
  getSportName,
} from '../../data/mockData';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

function Screen({ title, navigation, children, scroll = true }: any) {
  const Body: any = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={title} onBack={navigation ? () => navigation.goBack() : undefined} />
      <Body style={styles.body} contentContainerStyle={scroll ? styles.bodyContent : undefined}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

/* ------------------------- VENUE APPROVAL ------------------------- */
export function VenueApprovalScreen({ navigation }: any) {
  const [queue, setQueue] = useState(PENDING_VENUES);
  const [modal, setModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);

  const act = () => {
    if (modal) setQueue((q) => q.filter((v) => v.id !== modal.id));
    setModal(null);
  };

  return (
    <Screen title="Venue Approvals" navigation={navigation}>
      {queue.length === 0 ? (
        <EmptyState icon="✅" title="All caught up" subtitle="No venues pending approval." />
      ) : (
        queue.map((v) => (
          <Card key={v.id} style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>{v.name}</Text>
            <Text style={styles.muted}>{v.address}, {v.city}</Text>
            <View style={styles.chipRow}>
              {v.sports.map((s) => (
                <Text key={s} style={styles.tag}>{getSportName(s)}</Text>
              ))}
            </View>
            <Text style={styles.muted}>Courts: {v.courts.length} · ₹{v.pricePerSlot}/slot</Text>
            <View style={styles.rowGap}>
              <AppButton label="Reject" variant="secondary" style={{ flex: 1 }}
                onPress={() => setModal({ id: v.id, action: 'reject' })} />
              <AppButton label="Approve" style={{ flex: 1 }}
                onPress={() => setModal({ id: v.id, action: 'approve' })} />
            </View>
          </Card>
        ))
      )}
      <ConfirmActionModal
        visible={!!modal}
        title={modal?.action === 'approve' ? 'Approve venue?' : 'Reject venue?'}
        message={modal?.action === 'approve'
          ? 'The venue will go live and the owner will be notified.'
          : 'The owner will be notified with the rejection reason.'}
        confirmLabel={modal?.action === 'approve' ? 'Approve' : 'Reject'}
        danger={modal?.action === 'reject'}
        onConfirm={act}
        onDismiss={() => setModal(null)}
      />
    </Screen>
  );
}

/* ------------------------- VENUE MANAGEMENT ------------------------- */
export function VenueManagementScreen({ navigation }: any) {
  return (
    <Screen title="All Venues" navigation={navigation}>
      {VENUES.map((v) => (
        <Card key={v.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{v.name}</Text>
            <StatusBadge status={v.status} />
          </View>
          <Text style={styles.muted}>{v.city} · ⭐ {v.rating} ({v.reviewCount}) · ₹{v.pricePerSlot}</Text>
          <Text style={styles.muted}>Owner: {v.ownerId}</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- PLAYER MANAGEMENT ------------------------- */
const PLAYERS = [
  { id: 'p1', name: 'Rohan Sharma', email: 'rohan@example.com', bookings: 12, status: 'active' },
  { id: 'p2', name: 'Aarti Patil', email: 'aarti@example.com', bookings: 5, status: 'active' },
  { id: 'p3', name: 'Imran Khan', email: 'imran@example.com', bookings: 2, status: 'blocked' },
];
export function PlayerManagementScreen({ navigation }: any) {
  const [list, setList] = useState(PLAYERS);
  const toggle = (id: string) =>
    setList((l) => l.map((p) => (p.id === id ? { ...p, status: p.status === 'active' ? 'blocked' : 'active' } : p)));
  return (
    <Screen title="Players" navigation={navigation}>
      {list.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <View style={styles.rowGapSm}>
              <AvatarImage name={p.name} size={40} />
              <View>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.muted}>{p.email} · {p.bookings} bookings</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggle(p.id)}>
              <StatusBadge status={p.status} />
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- OWNER MANAGEMENT ------------------------- */
const OWNERS = [
  { id: 'o1', name: 'Green Sports Pvt Ltd', venues: 2, kyc: 'verified' },
  { id: 'o2', name: 'Boundary Ventures', venues: 2, kyc: 'pending' },
];
export function OwnerManagementScreen({ navigation }: any) {
  return (
    <Screen title="Owners" navigation={navigation}>
      {OWNERS.map((o) => (
        <Card key={o.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>{o.name}</Text>
              <Text style={styles.muted}>{o.venues} venues</Text>
            </View>
            <StatusBadge status={o.kyc} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- ADMIN BOOKINGS ------------------------- */
export function AdminBookingsScreen({ navigation }: any) {
  return (
    <Screen title="All Bookings" navigation={navigation}>
      {BOOKINGS.map((b) => (
        <Card key={b.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{b.venueName}</Text>
            <StatusBadge status={b.status} />
          </View>
          <Text style={styles.muted}>{getSportName(b.sport)} · {b.date} · {b.startTime}-{b.endTime}</Text>
          <Text style={styles.muted}>#{b.id} · ₹{b.amount}</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- PAYMENTS & REVENUE ------------------------- */
export function PaymentsRevenueScreen({ navigation }: any) {
  const [payouts, setPayouts] = useState(PAYOUTS);
  const [target, setTarget] = useState<string | null>(null);
  const totalCommission = PAYOUTS.reduce((s, p) => s + p.commissionDeducted, 0);

  const process = () => {
    if (target) setPayouts((l) => l.map((p) => (p.id === target ? { ...p, status: 'settled' } : p)));
    setTarget(null);
  };

  return (
    <Screen title="Payments & Revenue" navigation={navigation}>
      <View style={styles.statRow}>
        <StatCard label="Revenue Today" value={`₹${ADMIN_KPIS.revenueToday.toLocaleString('en-IN')}`} />
        <StatCard label="Commission" value={`₹${totalCommission.toLocaleString('en-IN')}`} accent={colors.owner} />
      </View>
      <Text style={styles.section}>Owner Payouts</Text>
      {payouts.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{p.ownerName}</Text>
            <StatusBadge status={p.status} />
          </View>
          <Text style={styles.muted}>Gross ₹{p.amount} · Commission ₹{p.commissionDeducted}</Text>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Net ₹{p.netAmount}</Text>
          {p.status === 'pending' && (
            <AppButton label="Process Payout" style={{ marginTop: spacing.sm }} onPress={() => setTarget(p.id)} />
          )}
        </Card>
      ))}
      <ConfirmActionModal
        visible={!!target}
        title="Process payout?"
        message="The net amount will be transferred to the owner's bank account."
        confirmLabel="Process"
        onConfirm={process}
        onDismiss={() => setTarget(null)}
      />
    </Screen>
  );
}

/* ------------------------- DISPUTE MANAGEMENT ------------------------- */
export function DisputeManagementScreen({ navigation }: any) {
  const [list, setList] = useState(DISPUTES);
  const [target, setTarget] = useState<string | null>(null);
  const resolve = () => {
    if (target) setList((l) => l.map((d) => (d.id === target ? { ...d, status: 'resolved' } : d)));
    setTarget(null);
  };
  return (
    <Screen title="Disputes" navigation={navigation}>
      {list.map((d) => (
        <Card key={d.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{d.venueName}</Text>
            <StatusBadge status={d.status} />
          </View>
          <Text style={styles.muted}>{d.playerName} vs {d.ownerName} · {d.date}</Text>
          <Text style={styles.issue}>{d.issue}</Text>
          {d.status === 'open' && (
            <AppButton label="Resolve Dispute" style={{ marginTop: spacing.sm }} onPress={() => setTarget(d.id)} />
          )}
        </Card>
      ))}
      <ConfirmActionModal
        visible={!!target}
        title="Resolve dispute?"
        message="Mark this dispute as resolved and notify both parties."
        confirmLabel="Resolve"
        onConfirm={resolve}
        onDismiss={() => setTarget(null)}
      />
    </Screen>
  );
}

/* ------------------------- COUPON MANAGEMENT ------------------------- */
export function CouponManagementScreen({ navigation }: any) {
  const [list, setList] = useState(COUPONS);
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');

  const add = () => {
    if (!code) return;
    setList((l) => [
      { id: `cp${l.length + 1}`, code: code.toUpperCase(), discountType: 'percent', discountValue: Number(value) || 10,
        minBooking: 300, maxDiscount: 200, validUntil: '2026-12-31', usedCount: 0, maxUses: 500, isActive: true },
      ...l,
    ]);
    setCode(''); setValue(''); setAdding(false);
  };

  return (
    <Screen title="Coupons" navigation={navigation}>
      <AppButton label={adding ? 'Cancel' : '+ New Coupon'} variant={adding ? 'secondary' : 'primary'}
        onPress={() => setAdding((a) => !a)} style={{ marginBottom: spacing.md }} />
      {adding && (
        <Card style={{ marginBottom: spacing.md }}>
          <AppInput label="Code" value={code} onChangeText={setCode} placeholder="e.g. SUMMER25" autoCapitalize="characters" />
          <AppInput label="Discount %" value={value} onChangeText={setValue} keyboardType="numeric" placeholder="10" />
          <AppButton label="Create Coupon" onPress={add} />
        </Card>
      )}
      {list.map((c) => (
        <Card key={c.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={[styles.cardTitle, { letterSpacing: 1 }]}>{c.code}</Text>
            <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
          </View>
          <Text style={styles.muted}>
            {c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
            {' '}· min ₹{c.minBooking} · used {c.usedCount}/{c.maxUses}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- NOTIFICATION BROADCAST ------------------------- */
export function NotificationBroadcastScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'players' | 'owners'>('all');
  const [sent, setSent] = useState(false);

  return (
    <Screen title="Broadcast" navigation={navigation}>
      <AppInput label="Title" value={title} onChangeText={setTitle} placeholder="Notification title" />
      <AppInput label="Message" value={body} onChangeText={setBody} placeholder="Write your message…" multiline />
      <Text style={styles.section}>Audience</Text>
      <View style={styles.rowGap}>
        {(['all', 'players', 'owners'] as const).map((a) => (
          <TouchableOpacity key={a} onPress={() => setAudience(a)}
            style={[styles.segment, audience === a && styles.segmentActive]}>
            <Text style={[styles.segmentText, audience === a && styles.segmentTextActive]}>
              {a[0].toUpperCase() + a.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppButton label="Send Broadcast" style={{ marginTop: spacing.lg }} onPress={() => setSent(true)} />
      <ConfirmActionModal
        visible={sent}
        title="Broadcast sent"
        message={`Your notification was queued for ${audience}.`}
        confirmLabel="Done"
        onConfirm={() => { setSent(false); navigation.goBack(); }}
        onDismiss={() => setSent(false)}
      />
    </Screen>
  );
}

/* ------------------------- ANALYTICS ------------------------- */
export function AnalyticsScreen({ navigation }: any) {
  const bars = [
    { label: 'Mon', v: 60 }, { label: 'Tue', v: 80 }, { label: 'Wed', v: 45 },
    { label: 'Thu', v: 95 }, { label: 'Fri', v: 70 }, { label: 'Sat', v: 100 }, { label: 'Sun', v: 88 },
  ];
  return (
    <Screen title="Analytics" navigation={navigation}>
      <View style={styles.statRow}>
        <StatCard label="GMV (month)" value="₹4.2L" />
        <StatCard label="Take Rate" value="11.4%" accent={colors.owner} />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Conversion" value="34%" accent={colors.warning} />
        <StatCard label="Repeat Rate" value="58%" accent={colors.admin} />
      </View>
      <Text style={styles.section}>Bookings this week</Text>
      <Card>
        <View style={styles.chart}>
          {bars.map((b) => (
            <View key={b.label} style={styles.barCol}>
              <View style={[styles.bar, { height: b.v }]} />
              <Text style={styles.barLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}

/* ------------------------- CATEGORY MANAGEMENT ------------------------- */
export function CategoryManagementScreen({ navigation }: any) {
  const [list, setList] = useState(SPORTS);
  const [name, setName] = useState('');
  const add = () => {
    if (!name) return;
    setList((l) => [...l, { id: `s${l.length + 1}`, name, icon: '🏅' }]);
    setName('');
  };
  return (
    <Screen title="Sport Categories" navigation={navigation}>
      <Card style={{ marginBottom: spacing.md }}>
        <AppInput label="New category" value={name} onChangeText={setName} placeholder="e.g. Squash" />
        <AppButton label="Add Category" onPress={add} />
      </Card>
      {list.map((s) => (
        <Card key={s.id} style={{ marginBottom: spacing.sm }}>
          <Text style={styles.cardTitle}>{s.icon}  {s.name}</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ------------------------- CMS ------------------------- */
const CMS_PAGES = ['Terms & Conditions', 'Privacy Policy', 'Cancellation Policy', 'About Us', 'FAQ', 'Contact'];
export function CMSScreen({ navigation }: any) {
  return (
    <Screen title="Content (CMS)" navigation={navigation}>
      {CMS_PAGES.map((p) => (
        <TouchableOpacity key={p}>
          <Card style={{ marginBottom: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{p}</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

/* ------------------------- ADMIN SETTINGS ------------------------- */
export function AdminSettingsScreen({ navigation }: any) {
  const { logout } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [commission, setCommission] = useState('10');
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <Screen title="Platform Settings" navigation={navigation}>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.toggleRow}>
          <Text style={styles.cardTitle}>Maintenance mode</Text>
          <Switch value={maintenance} onValueChange={setMaintenance} trackColor={{ true: colors.admin }} />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.cardTitle}>Auto-approve venues</Text>
          <Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ true: colors.admin }} />
        </View>
      </Card>
      <Card style={{ marginBottom: spacing.md }}>
        <AppInput label="Commission rate (%)" value={commission} onChangeText={setCommission} keyboardType="numeric" />
        <AppInput label="Convenience fee (₹)" value="20" onChangeText={() => {}} keyboardType="numeric" />
        <AppButton label="Save Settings" onPress={() => navigation.goBack()} />
      </Card>
      <AppButton label="Logout" variant="danger" onPress={() => setConfirmLogout(true)} />
      <ConfirmActionModal
        visible={confirmLogout}
        title="Logout?"
        message="You'll be returned to the role selection screen."
        confirmLabel="Logout"
        danger
        onConfirm={() => { setConfirmLogout(false); logout(); }}
        onDismiss={() => setConfirmLogout(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold as any, color: colors.text },
  muted: { fontSize: fontSize.sm, color: colors.textDim, marginTop: 2 },
  issue: { fontSize: fontSize.sm, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  section: { fontSize: fontSize.md, fontWeight: fontWeight.bold as any, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rowGapSm: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginVertical: spacing.sm },
  tag: { backgroundColor: colors.surfaceAlt, color: colors.textDim, fontSize: fontSize.xs, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  arrow: { fontSize: 22, color: colors.textDim },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.admin, borderColor: colors.admin },
  segmentText: { color: colors.textDim, fontWeight: fontWeight.medium as any },
  segmentTextActive: { color: '#fff' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, paddingTop: spacing.sm },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 18, backgroundColor: colors.admin, borderRadius: radius.sm },
  barLabel: { fontSize: fontSize.xs, color: colors.textDim, marginTop: spacing.xs },
});
