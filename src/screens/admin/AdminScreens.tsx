import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Switch, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppHeader, AppButton, AppInput, StatusBadge,
  StatCard, Card, EmptyState, AvatarImage, LoadingOverlay
} from '../../components/common';
import { ConfirmActionModal } from '../../modals';
import { useAuth } from '../../store/AuthContext';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';

import { useAdminVenues, useUpdateVenueStatus } from '../../api/hooks/useVenues';
import { useAdminUsers, useBlockUser, useUnblockUser } from '../../api/hooks/useUser';
import { useAdminBookings } from '../../api/hooks/useBookings';
import { useAdminPayouts, useProcessPayout } from '../../api/hooks/usePayouts';
import { useDisputes, useResolveDispute } from '../../api/hooks/useDisputes';
import { useAdminCoupons, useCreateCoupon } from '../../api/hooks/useCoupons';
import { useBroadcastNotification } from '../../api/hooks/useNotifications';
import { usePlatformSettings, useUpdateSettings } from '../../api/hooks/useAdmin';
import { useSports, useCreateSport, useUpdateSport, useDeleteSport } from '../../api/hooks/useSports';
import { extractApiError } from '../../api/client';

function Screen({ title, navigation, children, scroll = true, refreshControl }: any) {
  const Body: any = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={title} onBack={navigation ? () => navigation.goBack() : undefined} />
      <Body
        style={styles.body}
        contentContainerStyle={scroll ? styles.bodyContent : undefined}
        {...(scroll && refreshControl ? { refreshControl } : {})}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

/* ─── VENUE APPROVAL ───────────────────────────────────────────────── */
export function VenueApprovalScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminVenues({ status: 'PENDING' });
  const updateStatus = useUpdateVenueStatus();
  const pending = data?.venues ?? [];
  const [modal, setModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const act = async () => {
    if (!modal) return;
    try {
      await updateStatus.mutateAsync({
        id: Number(modal.id),
        data: { status: modal.action === 'approve' ? 'LIVE' : 'REJECTED' },
      });
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
    setModal(null);
  };

  return (
    <Screen title="Venue Approvals" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : pending.length === 0 ? (
        <EmptyState icon="✅" title="All caught up" subtitle="No venues pending approval." />
      ) : (
        pending.map((v) => (
          <Card key={v.id} style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>{v.name}</Text>
            <Text style={styles.muted}>{v.address}, {v.city}</Text>
            <Text style={styles.muted}>₹{v.pricePerHour}/hr</Text>
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

/* ─── VENUE MANAGEMENT ─────────────────────────────────────────────── */
export function VenueManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminVenues();
  const venues = data?.venues ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };
  return (
    <Screen title="All Venues" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : venues.map((v) => (
        <Card key={v.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{v.name}</Text>
            <StatusBadge status={v.status} />
          </View>
          <Text style={styles.muted}>{v.city} · ⭐ {v.rating} ({v.reviewCount}) · ₹{v.pricePerHour}/hr</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ─── PLAYER MANAGEMENT ────────────────────────────────────────────── */
export function PlayerManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminUsers({ role: 'PLAYER' });
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const users = data?.users ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const toggle = async (id: string, blocked: boolean) => {
    try {
      if (blocked) await unblockUser.mutateAsync(Number(id));
      else await blockUser.mutateAsync(Number(id));
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
  };

  return (
    <Screen title="Players" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : users.map((u) => (
        <Card key={u.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <View style={styles.rowGapSm}>
              <AvatarImage name={u.name} size={40} />
              <View>
                <Text style={styles.cardTitle}>{u.name}</Text>
                <Text style={styles.muted}>{u.email} · {u.totalBookings ?? 0} bookings</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggle(u.id, !!(u as any).isBlocked)}>
              <StatusBadge status={(u as any).isBlocked ? 'blocked' : 'active'} />
            </TouchableOpacity>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

/* ─── OWNER MANAGEMENT ─────────────────────────────────────────────── */
export function OwnerManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminUsers({ role: 'OWNER' });
  const users = data?.users ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };
  return (
    <Screen title="Venue Owners" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : users.map((u) => (
        <Card key={u.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowGapSm}>
            <AvatarImage name={u.name} size={40} />
            <View>
              <Text style={styles.cardTitle}>{u.name}</Text>
              <Text style={styles.muted}>{u.email}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

/* ─── ADMIN BOOKINGS ───────────────────────────────────────────────── */
export function AdminBookingsScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminBookings();
  const bookings = data?.bookings ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };
  return (
    <Screen title="All Bookings" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : bookings.map((b) => (
        <Card key={b.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>#{b.id}</Text>
            <StatusBadge status={b.status} />
          </View>
          <Text style={styles.muted}>{b.playerName} · {b.venueName}</Text>
          <Text style={styles.muted}>{b.date} {b.startTime}–{b.endTime} · ₹{b.amount}</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ─── PAYMENTS / REVENUE ───────────────────────────────────────────── */
export function PaymentsRevenueScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminPayouts();
  const processPayout = useProcessPayout();
  const payouts = data?.payouts ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  return (
    <Screen title="Payments & Payouts" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : payouts.map((p) => (
        <Card key={p.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{p.ownerName}</Text>
            <StatusBadge status={p.status} />
          </View>
          <Text style={styles.muted}>Net: ₹{p.netAmount.toLocaleString('en-IN')} (commission ₹{p.commissionDeducted})</Text>
          <Text style={styles.muted}>{p.date}</Text>
          {p.status === 'pending' && (
            <AppButton
              label="Process Payout"
              onPress={async () => {
                try { await processPayout.mutateAsync(Number(p.id)); }
                catch (err) { Alert.alert('Error', extractApiError(err)); }
              }}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>
      ))}
    </Screen>
  );
}

/* ─── DISPUTE MANAGEMENT ───────────────────────────────────────────── */
export function DisputeManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useDisputes();
  const resolveDispute = useResolveDispute();
  const disputes = data?.disputes ?? [];
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  return (
    <Screen title="Disputes" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : disputes.map((d) => (
        <Card key={d.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{d.venueName}</Text>
            <StatusBadge status={d.status} />
          </View>
          <Text style={styles.muted}>{d.playerName} vs {d.ownerName}</Text>
          <Text style={styles.muted}>{d.issue}</Text>
          {d.status === 'open' && (
            <AppButton label="Resolve" onPress={() => { setResolveModal(d.id); setNote(''); }} style={{ marginTop: spacing.md }} />
          )}
        </Card>
      ))}
      <ConfirmActionModal
        visible={!!resolveModal}
        title="Resolve Dispute"
        message="Add a resolution note for both parties."
        confirmLabel="Resolve"
        onConfirm={async () => {
          if (!resolveModal) return;
          try {
            await resolveDispute.mutateAsync({ id: Number(resolveModal), data: { resolvedNote: note || 'Resolved by admin.' } });
          } catch (err) { Alert.alert('Error', extractApiError(err)); }
          setResolveModal(null);
        }}
        onDismiss={() => setResolveModal(null)}
      />
    </Screen>
  );
}

/* ─── COUPON MANAGEMENT ────────────────────────────────────────────── */
export function CouponManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const coupons = data?.coupons ?? [];
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };
  const [code, setCode] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [minBook, setMinBook] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const handleCreate = async () => {
    try {
      await createCoupon.mutateAsync({
        code: code.toUpperCase(),
        discountType: type,
        discountValue: parseInt(value) || 0,
        minBooking: parseInt(minBook) || 0,
        validUntil: '2026-12-31',
        maxUses: parseInt(maxUses) || 100,
      });
      setShowCreate(false);
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
  };

  return (
    <Screen title="Coupons" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      <AppButton label="+ Create Coupon" onPress={() => setShowCreate(!showCreate)} style={{ marginBottom: spacing.lg }} />
      {showCreate && (
        <Card style={{ marginBottom: spacing.lg }}>
          <AppInput label="Code" value={code} onChangeText={setCode} placeholder="e.g. SUMMER20" />
          <View style={styles.rowGap}>
            <TouchableOpacity onPress={() => setType('PERCENT')} style={[styles.typeBtn, type === 'PERCENT' && styles.typeBtnActive]}>
              <Text style={[styles.typeBtnText, type === 'PERCENT' && { color: colors.white }]}>Percent</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setType('FLAT')} style={[styles.typeBtn, type === 'FLAT' && styles.typeBtnActive]}>
              <Text style={[styles.typeBtnText, type === 'FLAT' && { color: colors.white }]}>Flat ₹</Text>
            </TouchableOpacity>
          </View>
          <AppInput label={type === 'PERCENT' ? 'Discount %' : 'Discount ₹'} value={value} onChangeText={setValue} keyboardType="numeric" />
          <AppInput label="Min Booking ₹" value={minBook} onChangeText={setMinBook} keyboardType="numeric" />
          <AppInput label="Max Uses" value={maxUses} onChangeText={setMaxUses} keyboardType="numeric" />
          <AppButton label={createCoupon.isPending ? 'Creating…' : 'Create'} onPress={handleCreate} loading={createCoupon.isPending} style={{ marginTop: spacing.sm }} />
        </Card>
      )}
      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : coupons.map((c) => (
        <Card key={c.id} style={{ marginBottom: spacing.sm }}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{c.code}</Text>
            <StatusBadge status={c.isActive ? 'active' : 'inactive'} />
          </View>
          <Text style={styles.muted}>
            {c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`} · min ₹{c.minBooking}
          </Text>
          <Text style={styles.muted}>Used: {c.usedCount}/{c.maxUses} · Valid till {c.validUntil}</Text>
        </Card>
      ))}
    </Screen>
  );
}

/* ─── NOTIFICATION BROADCAST ───────────────────────────────────────── */
export function NotificationBroadcastScreen({ navigation }: any) {
  const broadcast = useBroadcastNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'PLAYERS' | 'OWNERS'>('ALL');

  const handleSend = async () => {
    if (!title || !body) { Alert.alert('Required', 'Enter title and message.'); return; }
    try {
      const res = await broadcast.mutateAsync({ title, body, audience });
      Alert.alert('Sent', res.message ?? 'Broadcast sent successfully.');
      setTitle(''); setBody('');
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
  };

  return (
    <Screen title="Broadcast Notification" navigation={navigation}>
      <AppInput label="Title" value={title} onChangeText={setTitle} placeholder="Notification title" />
      <AppInput label="Message" value={body} onChangeText={setBody} multiline placeholder="Your message..." />
      <Text style={styles.label}>Audience</Text>
      <View style={styles.rowGap}>
        {(['ALL', 'PLAYERS', 'OWNERS'] as const).map((a) => (
          <TouchableOpacity key={a} onPress={() => setAudience(a)}
            style={[styles.typeBtn, audience === a && styles.typeBtnActive]}>
            <Text style={[styles.typeBtnText, audience === a && { color: colors.white }]}>{a}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <AppButton
        label={broadcast.isPending ? 'Sending…' : 'Send Broadcast'}
        onPress={handleSend}
        loading={broadcast.isPending}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  );
}

/* ─── ADMIN SETTINGS ───────────────────────────────────────────────── */
export function AdminSettingsScreen({ navigation }: any) {
  const { data: settings, isLoading } = usePlatformSettings();
  const updateSettings = useUpdateSettings();
  const [commission, setCommission] = useState('');
  const [fee, setFee] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);

  React.useEffect(() => {
    if (settings) {
      setCommission(String(settings.commissionPercent ?? 10));
      setFee(String(settings.convenienceFee ?? 20));
      setMaintenance(settings.maintenanceMode ?? false);
      setAutoApprove(settings.autoApproveVenues ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        commissionPercent: parseInt(commission),
        convenienceFee: parseInt(fee),
        maintenanceMode: maintenance,
        autoApproveVenues: autoApprove,
      });
      Alert.alert('Saved', 'Settings updated successfully.');
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
  };

  if (isLoading) return <Screen title="Settings" navigation={navigation}><LoadingOverlay visible={isLoading} /></Screen>;

  return (
    <Screen title="Platform Settings" navigation={navigation}>
      <AppInput label="Commission %" value={commission} onChangeText={setCommission} keyboardType="numeric" />
      <AppInput label="Convenience Fee ₹" value={fee} onChangeText={setFee} keyboardType="numeric" />
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Maintenance Mode</Text>
        <Switch value={maintenance} onValueChange={setMaintenance} trackColor={{ true: colors.danger }} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Auto-approve Venues</Text>
        <Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ true: colors.primary }} />
      </View>
      <AppButton
        label={updateSettings.isPending ? 'Saving…' : 'Save Settings'}
        onPress={handleSave}
        loading={updateSettings.isPending}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  );
}

/* ─── STUB SCREENS ─────────────────────────────────────────────────── */
export function AnalyticsScreen({ navigation }: any) {
  return <Screen title="Analytics" navigation={navigation}><EmptyState icon="📊" title="Coming soon" subtitle="" /></Screen>;
}
export function CategoryManagementScreen({ navigation }: any) {
  const { data, isLoading, refetch } = useSports();
  const createSport = useCreateSport();
  const updateSport = useUpdateSport();
  const deleteSport = useDeleteSport();

  const sports = data ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); try { await refetch(); } finally { setRefreshing(false); } };

  const isEdit = editTarget !== null;
  const isPending = createSport.isPending || updateSport.isPending;

  const openCreate = () => {
    setEditTarget(null);
    setName('');
    setIcon('');
    setShowForm(true);
  };

  const openEdit = (s: { id: string; name: string; icon: string }) => {
    setEditTarget(s);
    setName(s.name);
    setIcon(s.icon);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setName('');
    setIcon('');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !icon.trim()) {
      Alert.alert('Required', 'Please enter both a name and an icon emoji.');
      return;
    }
    try {
      if (isEdit) {
        await updateSport.mutateAsync({ id: Number(editTarget.id), data: { name: name.trim(), icon: icon.trim() } });
      } else {
        await createSport.mutateAsync({ name: name.trim(), icon: icon.trim() });
      }
      closeForm();
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSport.mutateAsync(Number(deleteId));
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    }
    setDeleteId(null);
  };

  return (
    <Screen title="Sports" navigation={navigation} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}>
      <AppButton
        label={showForm && !isEdit ? 'Cancel' : '+ Add Sport'}
        variant={showForm && !isEdit ? 'secondary' : 'primary'}
        onPress={showForm && !isEdit ? closeForm : openCreate}
        style={{ marginBottom: spacing.lg }}
      />

      {showForm && (
        <Card style={{ marginBottom: spacing.lg }}>
          <AppInput label="Sport Name" value={name} onChangeText={setName} placeholder="e.g. Football" />
          <AppInput label="Icon (emoji)" value={icon} onChangeText={setIcon} placeholder="e.g. ⚽" />
          <View style={styles.rowGap}>
            {isEdit && (
              <AppButton label="Cancel" variant="secondary" onPress={closeForm} style={{ flex: 1 }} />
            )}
            <AppButton
              label={isPending ? (isEdit ? 'Updating…' : 'Creating…') : (isEdit ? 'Update Sport' : 'Create Sport')}
              onPress={handleSubmit}
              loading={isPending}
              disabled={isPending}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {isLoading ? (
        <LoadingOverlay visible={isLoading} />
      ) : sports.length === 0 ? (
        <EmptyState icon="⚽" title="No sports yet" subtitle="Add your first sport to get started." />
      ) : (
        sports.map((s) => (
          <Card key={s.id} style={{ marginBottom: spacing.sm }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowGapSm}>
                <Text style={{ fontSize: 26 }}>{s.icon}</Text>
                <Text style={styles.cardTitle}>{s.name}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <AppButton
                  label="Edit"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => openEdit(s)}
                  style={{ height: 36, paddingHorizontal: spacing.md }}
                />
                <AppButton
                  label="Delete"
                  variant="danger"
                  fullWidth={false}
                  onPress={() => setDeleteId(s.id)}
                  style={{ height: 36, paddingHorizontal: spacing.md }}
                />
              </View>
            </View>
          </Card>
        ))
      )}

      <ConfirmActionModal
        visible={!!deleteId}
        title="Delete Sport?"
        message="This will remove the sport from the platform. Venues using this sport may be affected."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onDismiss={() => setDeleteId(null)}
      />
    </Screen>
  );
}
export function CMSScreen({ navigation }: any) {
  return <Screen title="CMS" navigation={navigation}><EmptyState icon="📄" title="Coming soon" subtitle="" /></Screen>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  muted: { fontSize: fontSize.sm, color: colors.textMid, marginTop: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  tag: { backgroundColor: colors.primaryLight, color: colors.primaryDark, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, fontSize: fontSize.xs },
  rowGap: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rowGapSm: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid, marginTop: spacing.md, marginBottom: spacing.sm },
  typeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMid },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { fontSize: fontSize.md, color: colors.text },
});
