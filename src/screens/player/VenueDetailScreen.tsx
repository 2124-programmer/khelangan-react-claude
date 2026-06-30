import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, RefreshControl, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../../theme';
import { AppHeader, AppButton, AppInput, EmptyState, LoadingOverlay, StatusBadge } from '../../components/common';
import { centeredContent, MAX_CONTENT_WIDTH } from '../../responsive';
import { toast } from '../../toast';
import { VenueImageCarousel } from '../../components/venue';
import { VenueMap } from '../../components/venue/VenueMap';
import { ConfirmActionModal, ContactSheet } from '../../modals';
import { RatingSummary, ReviewCard, ReviewsEmptyState, WriteReviewSheet } from '../../components/reviews';
import { useVenueDetail, useAdminVenueDetail, useUpdateVenueStatus, useContactVenue } from '../../api/hooks/useVenues';
import { extractApiError } from '../../api/client';
import { formatRelativeTime } from '../../utils/dateUtils';
import { useVenueReviews } from '../../api/hooks/useReviews';
import { useSports } from '../../api/hooks/useSports';
import { useCurrentLocation } from '../../hooks/useCurrentLocation';
import { haversineKm, formatDistance } from '../../utils/locationUtils';
import { formatVenueAddress, getOpenStatus, getMapsUrl } from '../../utils/venueUtils';
import { useAuth } from '../../store/AuthContext';
import { setPendingNav } from '../../store/pendingNav';
import { OwnerSubscriptionCard } from '../../components/subscription/OwnerSubscriptionPurchase';

const AMENITY_ICON: Record<string, string> = {
  'Locker Room': '🔒',
  'Floodlights': '💡',
  'Drinking Water': '💧',
  'Washroom': '🚿',
  'Shower': '🚿',
  'Parking': '🅿️',
  'Cafeteria': '🍽️',
  'First Aid': '⛑️',
  'WiFi': '📶',
  'Changing Room': '👕',
  'Scoreboard': '📊',
  'Referee': '🦺',
  'Equipment Rental': '🎒',
  'CCTV': '📹',
  'AC': '❄️',
  'Gym': '🏋️',
  'Swimming Pool': '🏊',
  'Spectator Seating': '🪑',
  'Turf': '🌿',
  'Ball': '⚽',
};

function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

export default function VenueDetailScreen({ navigation, route }: any) {
  const venueId: string = route.params.venueId;
  const mode: 'player' | 'preview' | 'review' = route.params.mode ?? 'player';
  const isPreview = mode === 'preview';
  const isReview = mode === 'review';
  // Booking, court taps and review-writing are all disabled when the venue is being
  // looked at rather than booked (owner preview or admin review).
  const readOnly = isPreview || isReview;
  const { isLoggedIn, role } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [showContactLogin, setShowContactLogin] = useState(false);
  const contactVenue = useContactVenue();

  useEffect(() => {
    if (route.params?._successToast) toast.success(route.params._successToast as string);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin review fetches the ADMIN-scoped detail (any status + owner context);
  // everyone else uses the public/owner detail. Only one query is enabled at a time.
  const playerQuery = useVenueDetail(isReview ? undefined : venueId);
  const adminQuery = useAdminVenueDetail(isReview ? venueId : undefined);
  const adminContext = adminQuery.data;
  const venue = isReview ? adminContext?.venue : playerQuery.data;
  const isLoading = isReview ? adminQuery.isLoading : playerQuery.isLoading;
  const isError = isReview ? adminQuery.isError : playerQuery.isError;
  const refetchVenue = isReview ? adminQuery.refetch : playerQuery.refetch;

  // Returning from the login gate with an openContact intent: refetch first so the now-authenticated
  // payload includes the contact number (the cached guest fetch had it nulled), then open the sheet.
  useEffect(() => {
    if (route.params?.openContact) {
      refetchVenue();
      setContactOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: reviewsData, refetch: refetchReviews } = useVenueReviews(venueId);
  const { data: sports = [] } = useSports();
  const userLocation = useCurrentLocation();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([refetchVenue(), refetchReviews()]); } finally { setRefreshing(false); }
  };

  // ─── Admin approval actions ───────────────────────────────────────────────
  const updateStatus = useUpdateVenueStatus();
  const [actionModal, setActionModal] = useState<null | 'approve' | 'reject' | 'sendback'>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openAction = (action: 'approve' | 'reject' | 'sendback') => { setReason(''); setActionModal(action); };

  const submitDecision = async () => {
    if (!actionModal || !venue) return;
    if (actionModal === 'reject' && !reason.trim()) {
      toast.error('Add a reason so the owner knows what to fix.');
      return;
    }
    if (actionModal === 'sendback' && !reason.trim()) {
      toast.error('Add a note so the owner knows what to change.');
      return;
    }
    const statusFor = { approve: 'LIVE', reject: 'REJECTED', sendback: 'CHANGES_REQUESTED' } as const;
    setSubmitting(true);
    try {
      await updateStatus.mutateAsync({
        id: Number(venue.id),
        data: { status: statusFor[actionModal], rejectionReason: reason.trim() || undefined },
      });
      toast.success(
        actionModal === 'approve' ? 'Venue approved. The owner can now start a trial and pick courts.'
          : actionModal === 'reject' ? 'Venue rejected. The owner has been notified.'
            : 'Sent back to the owner for changes.',
      );
      setActionModal(null);
      setReason('');
      navigation.goBack();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reviews = reviewsData?.reviews ?? [];

  const getSportLabel = (sportId: string) => {
    const s = sports.find((sp) => sp.id === sportId);
    return s ? `${s.icon} ${s.name}` : sportId;
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <LoadingOverlay visible={isLoading} />
      </SafeAreaView>
    );
  }

  if (isError || !venue) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <EmptyState icon="⚠️" title="Venue not found" subtitle="It may have been removed or is unavailable" />
      </SafeAreaView>
    );
  }

  const fullAddress = formatVenueAddress(venue.address, venue.city, venue.state, venue.pincode);
  const hoursLabel = `${fmt12h(venue.openTime)} – ${fmt12h(venue.closeTime)}`;
  const distLabel =
    userLocation && venue.lat && venue.lng && venue.lat !== 0
      ? formatDistance(haversineKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng))
      : null;
  const openStatus = getOpenStatus(venue.openTime, venue.closeTime);

  // Admin-review derived data
  const hasPhotos = (venue.images?.length ?? 0) > 0 || venue.photos.length > 0;
  const checklist = [
    { label: 'Photos added', ok: hasPhotos },
    { label: 'At least one court', ok: venue.courts.length > 0 },
    { label: 'Address complete', ok: !!venue.address && !!venue.city && !!venue.pincode },
    { label: 'Contact phone', ok: !!venue.contactPhone },
  ];
  const completedCount = checklist.filter((c) => c.ok).length;
  const completePct = Math.round((completedCount / checklist.length) * 100);
  const owner = adminContext?.owner;
  const ownerHistory = adminContext?.ownerHistory;
  // Approval thread: admin review uses the enriched history; owner preview uses the venue's own comments.
  const approvalThread = isReview ? (adminContext?.commentHistory ?? []) : (venue.approvalComments ?? []);
  const intendedPlanCode = adminContext?.intendedPlanCode;

  // Login-gated: guests get an info prompt → auth gate → returns here and auto-opens the sheet.
  // The number itself is never in a guest's payload, so it can't be revealed without logging in.
  const handleContactPress = () => {
    if (isLoggedIn) setContactOpen(true);
    else setShowContactLogin(true);
  };

  const handleBookNow = () => {
    if (isLoggedIn) {
      if (role !== 'player') {
        Alert.alert(
          'Player Account Required',
          'You are logged in as a Venue Owner. Please use a Player account to book a slot.',
          [{ text: 'OK' }],
        );
        return;
      }
      navigation.navigate('SlotSelection', { venueId: venue.id });
      return;
    }
    setShowLoginPrompt(true);
  };

  const handleCourtTap = (courtId: string, sportId: string) => {
    if (isLoggedIn) {
      if (role !== 'player') {
        Alert.alert('Player Account Required', 'Use a Player account to book.', [{ text: 'OK' }]);
        return;
      }
      navigation.navigate('SlotSelection', { venueId: venue.id, courtId, sportId });
      return;
    }
    setShowLoginPrompt(true);
  };

  const handleShare = async () => {
    const deepLink = `scoreadda://venue/${venue.id}`;
    const playStore = `https://play.google.com/store/apps/details?id=com.turfbook.app`;
    const shareText = [
      `Check out ${venue.name} on Score-Adda! ⚽`,
      `📍 ${fullAddress}`,
      `Starting ₹${venue.pricePerHour}/hr`,
      ``,
      `📲 Open in Score-Adda: ${deepLink}`,
      ``,
      `Don't have the app? Download here: ${playStore}`,
    ].join('\n');

    if (Platform.OS === 'web') {
      // 1. Web Share API — works on mobile Chrome over HTTPS (production)
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({ title: `${venue.name} – Score-Adda`, text: shareText });
          return;
        } catch { /* cancelled or not secure context — fall through */ }
      }
      // 2. Clipboard API — works on HTTPS
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareText);
          toast.success('Copied to clipboard!');
          return;
        } catch { /* fall through */ }
      }
      // 3. execCommand fallback — works on plain HTTP (dev environment)
      try {
        const el = document.createElement('textarea');
        el.value = shareText;
        el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success('Copied to clipboard!');
      } catch { /* nothing worked */ }
      return;
    }

    try {
      await Share.share({ title: `${venue.name} – Score-Adda`, message: shareText });
    } catch {
      // user cancelled — no-op
    }
  };

  const handleDirections = () => {
    const url = getMapsUrl(venue.lat ?? 0, venue.lng ?? 0, venue.name, fullAddress);
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <AppHeader
        title={venue.name}
        onBack={() => navigation.goBack()}
      />

      {isPreview && (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerText}>👁  Preview — this is how players see your venue</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditVenue', { venueId: venue.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.previewEditLink}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={centeredContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Hero Carousel */}
        <VenueImageCarousel images={venue.images ?? []} />

        <View style={styles.body}>

          {/* Name + rating badge */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{venue.name}</Text>
            <RatingSummary
              ratingAverage={venue.ratingAverage}
              ratingCount={venue.ratingCount}
              variant="compact"
              onPress={() => navigation.navigate('VenueReviews', { venueId: venue.id })}
            />
          </View>

          {/* Tappable address → directions + Share button */}
          <View style={styles.addrRow}>
            <TouchableOpacity onPress={handleDirections} activeOpacity={0.7} style={{ flex: 1 }}>
              <Text style={[styles.addr, styles.addrLink]} numberOfLines={2}>
                📍 {fullAddress}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={styles.shareIconBtn}>
              <Feather name="share-2" size={16} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          {/* Quick-facts strip */}
          <View style={styles.factsStrip}>
            <Text style={[styles.factsItem, openStatus.isOpen ? styles.factsOpen : styles.factsClosed]}>
              {openStatus.label}
            </Text>
            {distLabel && (
              <>
                <Text style={styles.factsDot}>·</Text>
                <Text style={styles.factsItem}>📍 {distLabel}</Text>
              </>
            )}
            <Text style={styles.factsDot}>·</Text>
            <Text style={styles.factsItem}>₹{venue.pricePerHour}/hr</Text>
          </View>

          {/* ─── Admin review context ─── */}
          {isReview && (
            <View style={styles.adminBlock}>
              {/* Status + submission age */}
              <View style={[styles.adminCard, shadow.card]}>
                <View style={styles.adminCardHeadRow}>
                  <Text style={styles.adminCardTitle}>Submission</Text>
                  <StatusBadge status={venue.status} />
                </View>
                <Text style={styles.adminMuted}>
                  {venue.submittedAt
                    ? `Submitted ${formatRelativeTime(venue.submittedAt)}`
                    : 'Submission date unavailable'}
                </Text>

                {/* Completeness checklist */}
                <View style={styles.completeRow}>
                  <Text style={styles.adminCardTitle}>Completeness</Text>
                  <Text style={[styles.completePct, completePct === 100 ? styles.okText : styles.warnText]}>
                    {completePct}%
                  </Text>
                </View>
                {checklist.map((c) => (
                  <View key={c.label} style={styles.checkItem}>
                    <Text style={[styles.checkMark, c.ok ? styles.okText : styles.warnText]}>
                      {c.ok ? '✓' : '✗'}
                    </Text>
                    <Text style={[styles.checkLabel, !c.ok && styles.warnText]}>{c.label}</Text>
                  </View>
                ))}
              </View>

              {/* Owner block */}
              {owner && (
                <View style={[styles.adminCard, shadow.card]}>
                  <Text style={styles.adminCardTitle}>Owner</Text>
                  <Text style={styles.ownerName}>{owner.name || 'Unknown owner'}</Text>
                  {!!owner.registeredOn && (
                    <Text style={styles.adminMuted}>Registered {formatRelativeTime(owner.registeredOn)}</Text>
                  )}
                  {ownerHistory && (
                    <Text style={styles.adminMuted}>
                      {ownerHistory.totalVenues} venue{ownerHistory.totalVenues === 1 ? '' : 's'} total · {ownerHistory.liveVenues} live
                    </Text>
                  )}
                  {!!owner.phone && (
                    <TouchableOpacity
                      style={styles.ownerContactRow}
                      onPress={() => Linking.openURL(`tel:${owner.phone}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.ownerContactIcon}>📞</Text>
                      <Text style={[styles.ownerContactText, styles.infoLink]}>{owner.phone}</Text>
                      <Text style={styles.ownerCallCta}>Call</Text>
                    </TouchableOpacity>
                  )}
                  {!!owner.email && (
                    <TouchableOpacity
                      style={styles.ownerContactRow}
                      onPress={() => Linking.openURL(`mailto:${owner.email}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.ownerContactIcon}>✉️</Text>
                      <Text style={[styles.ownerContactText, styles.infoLink]} numberOfLines={1}>{owner.email}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Subscription note */}
              <View style={[styles.adminNote]}>
                <Text style={styles.adminNoteText}>
                  {venue.courts.length} court{venue.courts.length === 1 ? '' : 's'}
                  {intendedPlanCode ? ` · committed tier: ${intendedPlanCode}` : ' · free tier (Starter)'}.
                  Approving makes the venue approved; the owner then starts a free trial (or a paid
                  plan) and picks which courts to make bookable before players can book.
                </Text>
              </View>
            </View>
          )}

          {/* Approval activity thread (owner preview + admin review) */}
          {readOnly && approvalThread.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Approval activity</Text>
              {approvalThread.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Text style={styles.commentAction}>
                    {c.action.replace(/_/g, ' ')} · {c.authorRole}
                    {c.createdAt ? `  ·  ${formatRelativeTime(c.createdAt)}` : ''}
                  </Text>
                  {!!c.comment && <Text style={styles.commentText}>{c.comment}</Text>}
                </View>
              ))}
            </>
          )}

          {/* Sports */}
          {venue.sports.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Sports Available</Text>
              <View style={styles.chipWrap}>
                {venue.sports.map((s) => (
                  <View key={s} style={styles.chip}>
                    <Text style={styles.chipText}>{getSportLabel(s)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Courts — tappable, go straight to slot selection */}
          <Text style={styles.sectionTitle}>Courts</Text>
          {/* Owner-only: subscription + court-coverage purchase (not shown to players). */}
          {isPreview && (
            <OwnerSubscriptionCard
              venueId={venue.id}
              onAddCourt={() => navigation.navigate('EditVenue', { venueId: venue.id })}
            />
          )}
          {venue.courts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No courts have been added yet</Text>
            </View>
          ) : (
            venue.courts.map((c) => {
              const sportLabel = getSportLabel(c.sportId);
              // Only show court hours if they differ from venue hours
              const courtHoursDiffer =
                c.effectiveOpenTime !== venue.openTime ||
                c.effectiveCloseTime !== venue.closeTime;
              const metaParts: string[] = [];
              if (sportLabel) metaParts.push(sportLabel);
              if (c.type) metaParts.push(c.type);
              if (courtHoursDiffer) metaParts.push(`${fmt12h(c.effectiveOpenTime)} – ${fmt12h(c.effectiveCloseTime)}`);

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.courtCard, shadow.card]}
                  onPress={readOnly ? undefined : () => handleCourtTap(c.id, c.sportId)}
                  activeOpacity={readOnly ? 1 : 0.8}
                >
                  <View style={styles.courtHeader}>
                    <Text style={styles.courtName}>{c.name}</Text>
                    <View style={styles.courtRight}>
                      <Text style={styles.courtPrice}>₹{c.effectivePricePerHour}/hr</Text>
                      {!readOnly && <Text style={styles.courtChevron}>›</Text>}
                    </View>
                  </View>
                  {metaParts.length > 0 && (
                    <Text style={styles.courtMeta}>{metaParts.join('  ·  ')}</Text>
                  )}
                  {!readOnly && <Text style={styles.courtCta}>Tap to view & book slots</Text>}
                </TouchableOpacity>
              );
            })
          )}

          {/* About — description + operating hours + contact */}
          <Text style={styles.sectionTitle}>About</Text>
          {!!venue.description && (
            <Text style={[styles.desc, { marginBottom: spacing.md }]}>{venue.description}</Text>
          )}
          <View style={[styles.infoCard, shadow.card]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>⏰</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Operating Hours</Text>
                <Text style={styles.infoValue}>{hoursLabel}</Text>
              </View>
              {venue.contactAvailable && (
                <TouchableOpacity
                  style={styles.contactIconBtn}
                  onPress={handleContactPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="phone" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Amenities */}
          {venue.amenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenityGrid}>
                {venue.amenities.map((a) => (
                  <View key={a} style={styles.amenityItem}>
                    <Text style={styles.amenityIcon}>{AMENITY_ICON[a] ?? '✓'}</Text>
                    <Text style={styles.amenityText} numberOfLines={2}>{a}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Location */}
          <Text style={styles.sectionTitle}>Location</Text>
          <VenueMap
            lat={venue.lat ?? 0}
            lng={venue.lng ?? 0}
            name={venue.name}
            fullAddress={fullAddress}
          />

          {/* Reviews */}
          <View style={styles.reviewsSectionHeader}>
            <Text style={styles.sectionTitle}>
              Reviews{venue.ratingCount > 0 ? ` (${venue.ratingCount})` : ''}
            </Text>
            {!readOnly && isLoggedIn && role === 'player' ? (
              <TouchableOpacity onPress={() => setWriteReviewOpen(true)} activeOpacity={0.7}>
                <Text style={styles.writeReviewLink}>
                  {reviews.some((r) => r.isOwn) ? 'Edit your review' : 'Write a review'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {reviews.length === 0 ? (
            <ReviewsEmptyState
              ctaLabel={!readOnly && isLoggedIn && role === 'player' ? 'Write a review' : undefined}
              onCtaPress={!readOnly && isLoggedIn && role === 'player' ? () => setWriteReviewOpen(true) : undefined}
            />
          ) : (
            <>
              {reviews.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} />)}
              {venue.ratingCount > 3 ? (
                <TouchableOpacity
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('VenueReviews', { venueId: venue.id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllText}>See all {venue.ratingCount} reviews ›</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

        </View>
      </ScrollView>

      {/* Sticky bottom bar — review actions vs preview vs booking */}
      {isReview ? (
        <View style={[styles.bottomBar, styles.reviewBar, shadow.modal]}>
          <AppButton
            label="Send back"
            variant="secondary"
            onPress={() => openAction('sendback')}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Reject"
            variant="danger"
            onPress={() => openAction('reject')}
            style={{ flex: 1 }}
          />
          <AppButton
            label="Approve"
            onPress={() => openAction('approve')}
            style={{ flex: 1 }}
          />
        </View>
      ) : isPreview ? (
        <View style={[styles.bottomBar, shadow.modal]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewBarLabel}>Preview Mode</Text>
            <Text style={styles.previewBarHint}>Booking is disabled in preview</Text>
          </View>
          <AppButton
            label="Edit Venue"
            fullWidth={false}
            variant="secondary"
            onPress={() => navigation.navigate('EditVenue', { venueId: venue.id })}
            style={{ paddingHorizontal: 20 }}
          />
        </View>
      ) : (
        <View style={[styles.bottomBar, shadow.modal]}>
          <View>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>
              ₹{venue.pricePerHour}
              <Text style={styles.perSlot}>/hr</Text>
            </Text>
          </View>
          <AppButton
            label="Book Now"
            fullWidth={false}
            onPress={handleBookNow}
            style={{ paddingHorizontal: 40 }}
          />
        </View>
      )}

      <ContactSheet
        visible={contactOpen}
        phone={venue.contactPhone}
        venueName={venue.name}
        whatsappMessage={`Hi! I'd like to know more about ${venue.name}.`}
        onContact={(channel) => contactVenue.mutate({ venueId: venue.id, channel })}
        onClose={() => setContactOpen(false)}
      />

      <ConfirmActionModal
        visible={showContactLogin}
        title="Log in to contact the venue"
        message={`Please log in to call or message ${venue.name}.`}
        confirmLabel="Log in"
        onDismiss={() => setShowContactLogin(false)}
        onConfirm={() => {
          setShowContactLogin(false);
          setPendingNav({
            screen: 'VenueDetail',
            params: {
              venueId: venue.id,
              openContact: true,
              _successToast: 'Logged in. Choose how to contact the venue.',
            },
          });
          navigation.navigate('Login');
        }}
      />

      {!readOnly && (
        <>
          <WriteReviewSheet
            venueId={Number(venue.id)}
            visible={writeReviewOpen}
            onClose={() => setWriteReviewOpen(false)}
          />
          <ConfirmActionModal
            visible={showLoginPrompt}
            title="Login Required"
            message="Login is required as a Player to book a slot. Do you want to continue?"
            confirmLabel="Proceed"
            onDismiss={() => setShowLoginPrompt(false)}
            onConfirm={() => {
              setShowLoginPrompt(false);
              setPendingNav({
                screen: 'VenueDetail',
                params: { venueId: venue.id, _successToast: 'Logged in successfully! Tap Book Now to proceed.' },
              });
              navigation.navigate('Login');
            }}
          />
        </>
      )}

      {isReview && (
        <ConfirmActionModal
          visible={!!actionModal}
          title={
            actionModal === 'approve' ? 'Approve venue?'
              : actionModal === 'reject' ? 'Reject venue?'
                : 'Send back for changes?'
          }
          message={
            actionModal === 'approve'
              ? 'The venue becomes publicly listable and the owner is notified.'
              : actionModal === 'reject'
                ? 'The owner is notified with your reason. Use this only for venues that should not exist on the platform.'
                : 'The venue returns to the owner as a draft to edit and resubmit. Add a note on what to change.'
          }
          confirmLabel={submitting ? 'Working…' : actionModal === 'approve' ? 'Approve' : actionModal === 'reject' ? 'Reject' : 'Send back'}
          danger={actionModal === 'reject'}
          onConfirm={submitDecision}
          onDismiss={() => { setActionModal(null); setReason(''); }}
          extraContent={
            actionModal && actionModal !== 'approve' ? (
              <AppInput
                label={actionModal === 'reject' ? 'Reason (required)' : 'What should the owner change? (optional)'}
                value={reason}
                onChangeText={setReason}
                multiline
                placeholder={actionModal === 'reject' ? 'e.g. Photos are unclear and address is incomplete' : 'e.g. Please add at least one court and clearer photos'}
              />
            ) : undefined
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    position: 'absolute', top: spacing.lg, left: spacing.lg,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  body: { padding: spacing.lg, paddingBottom: 120 },

  // Name + rating badge
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },

  // Address + Share row
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  addr: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 20 },
  addrLink: { color: colors.primary },
  shareIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },

  // Quick-facts strip
  factsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  factsDot: { fontSize: fontSize.xs, color: colors.textDim },
  factsItem: { fontSize: fontSize.xs, color: colors.textMid },
  factsOpen: { color: '#15803D', fontWeight: fontWeight.semibold },
  factsClosed: { color: '#B91C1C', fontWeight: fontWeight.semibold },

  // Section titles
  sectionTitle: {
    fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },

  // Sports chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  chipText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: fontWeight.semibold },

  // Courts
  courtCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.sm,
  },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courtName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, flex: 1 },
  courtRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  courtPrice: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary },
  courtChevron: { fontSize: 20, color: colors.textDim },
  courtMeta: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  courtCta: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 6 },

  // Amenity grid
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  amenityItem: {
    width: '22%', minHeight: 72,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  amenityIcon: { fontSize: 22 },
  amenityText: { fontSize: fontSize.xs, color: colors.textMid, textAlign: 'center' },

  // Description
  desc: { fontSize: fontSize.sm, color: colors.textMid, lineHeight: 22 },

  // Empty box
  emptyBox: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center',
  },
  emptyBoxText: { fontSize: fontSize.sm, color: colors.textDim },

  // Info card
  infoCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    marginTop: spacing.xl, overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  infoDivider: { height: 1, backgroundColor: colors.border },
  infoIcon: { fontSize: 20, width: 34, textAlign: 'center' },
  infoContent: { flex: 1, marginLeft: spacing.sm },
  infoLabel: { fontSize: fontSize.xs, color: colors.textDim },
  infoValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, marginTop: 1 },
  infoLink: { color: colors.primary },
  infoChevron: { fontSize: 20, color: colors.textDim, marginLeft: spacing.sm },
  contactIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm,
  },

  // Reviews
  reviewsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.md },
  writeReviewLink: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },
  seeAllBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  seeAllText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.semibold },

  // Preview banner
  previewBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  previewBannerText: { fontSize: fontSize.xs, color: '#1D4ED8', fontWeight: fontWeight.semibold, flex: 1 },
  previewEditLink: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold, paddingLeft: spacing.md },

  // Bottom booking bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.lg,
    borderTopWidth: 1, borderTopColor: colors.border,
    // On web large screens, cap + center the bar so its buttons line up with the centered page
    // content (which is capped at MAX_CONTENT_WIDTH). Mobile is unaffected — the cap never bites.
    ...(Platform.OS === 'web' ? { maxWidth: MAX_CONTENT_WIDTH, marginHorizontal: 'auto' } : null),
  },
  priceLabel: { fontSize: fontSize.xs, color: colors.textDim },
  price: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  perSlot: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.regular },
  previewBarLabel: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold },
  previewBarHint: { fontSize: fontSize.xs, color: colors.textDim, marginTop: 1 },

  // Admin review action bar (3 buttons)
  reviewBar: { gap: spacing.sm },

  // Admin review context
  adminBlock: { marginTop: spacing.lg, gap: spacing.md },
  adminCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  adminCardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  adminCardTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },
  adminMuted: { fontSize: fontSize.xs, color: colors.textMid, marginTop: 4 },
  completeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  completePct: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  okText: { color: '#15803D' },
  warnText: { color: '#B91C1C' },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  checkMark: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, width: 16 },
  checkLabel: { fontSize: fontSize.sm, color: colors.textMid },
  ownerName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: 4 },
  ownerContactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  ownerContactIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  ownerContactText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  ownerCallCta: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.bold },
  adminNote: { backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#BFDBFE' },
  adminNoteText: { fontSize: fontSize.xs, color: '#1D4ED8', lineHeight: 17 },

  // Approval activity thread
  commentRow: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  commentAction: { fontSize: fontSize.xs, color: colors.textDim, fontWeight: fontWeight.semibold, textTransform: 'capitalize' },
  commentText: { fontSize: fontSize.sm, color: colors.text, marginTop: 4, lineHeight: 19 },
});
