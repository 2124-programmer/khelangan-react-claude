# Score-Adda — Screen & Flow Documentation

> Generated from the codebase at `turfbook-claudeAI/` (Expo React Native + TypeScript, React Navigation, TanStack Query v5, Axios) against the Spring Boot + MySQL backend (`/api/v1`). Every route name, file path, and endpoint below is quoted from code. Anything not provable from code is marked **(inferred)**. Build gaps are marked **[Not yet built]** / **[Partial]** / **[Legacy/unreachable]**.

---

## 1. Overview

Score-Adda is a sports-venue (turf) booking app with three roles:

- **Player** — discovers venues, books slots, manages bookings, reviews venues.
- **Owner** — lists venues & courts, manages booking requests, holds a per-venue subscription.
- **Admin** (incl. a **Super-admin** level) — moderates venues, manages owners/players/disputes, runs subscriptions and platform settings.

Revenue is **subscriptions-only** (no booking commission is the product rule — see discrepancies). Owner plan tiers (Trial → Pro Max) cap court count at **2 / 2 / 4 / 6 / 12**, enforced server-side.

### Navigation structure (from code)

| Navigator | File | When shown | Top-level routes |
|---|---|---|---|
| `RootNavigator` | `src/navigation/RootNavigator.tsx` | always | switches on `isLoading`/`isLoggedIn`/`role` |
| `AuthNavigator` | `src/navigation/AuthNavigator.tsx` | while `isLoading`/splash | `Splash`*, `Login`, `Register`, `OTPVerification`, `ForgotPassword` |
| `GuestNavigator` | `src/navigation/GuestNavigator.tsx` | not logged in | tabs `GuestHomeTab` (route `GuestHome` = PlayerHomeScreen, `VenueDetail`, auth screens) + `GuestLoginTab` (route `Login`) |
| `PlayerTabNavigator` | `src/navigation/PlayerTabNavigator.tsx` | role = player | tabs `HomeTab`(`Home`), `Bookings`(`BookingsHome`), `OffersTab`(`OffersHome`), `Profile`(`ProfileHome`) + a shared stack |
| `OwnerTabNavigator` | `src/navigation/OwnerTabNavigator.tsx` | role = owner | tabs `DashboardTab`(`DashboardHome`), `VenuesTab`(`VenuesHome`), `OwnerBookings`(`OwnerBookingsHome`), `EarningsTab`(`EarningsHome`), `OwnerProfileTab`(`OwnerProfileHome`) + a shared stack |
| `AdminNavigator` | `src/navigation/AdminNavigator.tsx` | role = admin | single stack, initial `AdminDashboard` (see §5) |

`RootNavigator` gates on `useAuth()` + `useSplashGate()`: `isLoading || !splashDone → AuthNavigator`; `!isLoggedIn → GuestNavigator`; `owner → OwnerTabNavigator`; `admin → AdminNavigator`; else `PlayerTabNavigator`.

### Legend — condition tags

| Tag | Meaning |
|---|---|
| **Requires auth** | A valid JWT session is required (`useAuth().isLoggedIn`). |
| **Role** | Player / Owner / Admin / Super-admin required. |
| **returnTo / pendingNav** | Unauthenticated action stores intent via `setPendingNav(...)` then routes to `Login`; after auth, `PlayerHomeScreen.useFocusEffect` calls `consumePendingNav()` and `navigation.reset` to resume. (The `route.params.returnTo` plumbed through Login/Register/OTP is forwarded but never consumed — `pendingNav` is the real mechanism.) |
| **availableActions** | Server returns a per-resource `availableActions[]`; the UI shows/hides actions from it. RBAC (super-admin-only ban/delete) is enforced by the server stripping `BAN/UNBAN/DELETE` from the list. |
| **plan/court-limit** | Server returns `409 COURT_LIMIT_EXCEEDED`; client surfaces `allowed/current/planName` with an Upgrade action. |
| **resource state** | Operation gated by domain status (e.g. booking `pending`, venue `draft`/`changes_requested`/`live`). |
| **QueryState** | Whether the screen uses the shared `src/components/QueryState.tsx` loading/error/empty wrapper. |

### Known discrepancies & build-status flags (verified in code)

1. **Google Sign-In is NOT implemented** anywhere in `src` (only Google **Maps**). Product fact lists it; code does not have it. **(flag)**
2. **Revenue "subscriptions-only" vs. commission/payout code:** `OwnerDashboardScreen`, `EarningsScreen`, `OwnerBookingDetailScreen` ("platform commission", "Your Earning = amount − commission"), `PaymentsRevenueScreen`, and `AdminSettingsScreen` (commission %, convenience fee) still implement the legacy commission/payout model. **(flag)**
3. **Coupons backend not built** — `OffersScreen` **[Partial]**, `CouponManagementScreen` **[Partial]**, `BookingConfirmScreen` coupon validate **[Not yet built]**.
4. **Legacy single-slot payment path** `BookingConfirm → Payment → BookingSuccess` is **[Legacy/unreachable]** (no in-app caller); the live flow is `SlotSelection → bulk-create → Bookings`.
5. **Stubs:** `WalletScreen` **[Not yet built]** (also contradicts no-platform-payments), `RescheduleScreen` **[Not yet built]**, `AnalyticsScreen`/`CMSScreen` **[Not built — placeholders]**.
6. **`SearchScreen` is orphaned** — not registered in any navigator's shared stack and has no caller; filter button is a no-op.
7. **Player email-change uses OWNER-namespaced endpoints** (`/api/v1/owner/email-change-requests/*`) from `SecurityScreen`/`EmailChangeScreen`. Phone-change correctly uses `/api/v1/users/me/phone-change-requests/*`. **(flag)**
8. **Trial "auto-trigger" nuance:** admin `APPROVE` moves a venue to `LIVE`; the owner then starts the trial and picks bookable courts (approval→owner-trial handoff, not an instant server auto-create).
9. **Dead legacy admin code:** `AdminScreens.tsx` still exports `VenueApprovalScreen`, `VenueManagementScreen`, `PlayerManagementScreen`, `OwnerManagementScreen`, `DisputeManagementScreen` — none are imported by `AdminNavigator` (alias routes point to the scaled screens). Unreachable.
10. **`QueryState` adoption:** only `PlayerHomeScreen` uses it (venue feed). All other ~40 screens use bespoke `LoadingOverlay`/`EmptyState`/`ActivityIndicator`/`Alert`/`toast`.

---

## 2. Shared / Auth screens (role-agnostic)

### Splash
- **Route / component:** `Splash` (initial route of `AuthNavigator`) — `src/screens/auth/SplashScreen.tsx`
- **Role / access:** Public
- **Purpose:** Animated branded intro on cold start; signals splash completion.
- **Entry points:** App cold start; held by `RootNavigator` until `useSplashGate()` is done.
- **Operations:** None (purely presentational). Side effect: calls `markSplashDone()` after the animation (~6s) to advance the gate.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Auto-advance (`markSplashDone`) | No | Public | Fires after timed animation; no user action |

- **Navigates to:** None directly (hand-off: `RootNavigator` re-renders to Guest/role tree).
- **API endpoints:** None.
- **States:** No data; no `QueryState`. *(Note: `AuthContext.login(role)` is commented as a "SplashScreen role picker" but is not wired in this file — discrepancy.)*

### Login
- **Route / component:** `Login` — `src/screens/auth/LoginScreen.tsx` (in `AuthNavigator`, `GuestNavigator` `GuestLoginTab`, and player/owner/admin shared lists)
- **Role / access:** Public (resulting session may be Player/Owner/Admin/Super-admin)
- **Purpose:** Email+password login, or passwordless email-addressed OTP login.
- **Entry points:** "Sign In" guest tab; `navigate('Login')` from `VenueDetailScreen` (with `setPendingNav`); `requireAuth` fallback in `PlayerHomeScreen`; "Login" link on Register.
- **Operations:** Edit email/password; **Login**; **Continue with OTP** (📱); Forgot Password link; Register link.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Login submit | No | Public | `validateEmail` + `validateLoginPassword`; 401→"Incorrect email or password", 403→suspended; skips welcome toast if `peekPendingNav()` non-null |
  | Continue with OTP | No | Public | valid email only; 404→"No account found"; forwards `returnTo` |
  | Forgot Password / Register links | No | Public | always |

- **Navigates to:** `OTPVerification`, `ForgotPassword`, `Register` (post-`updateSession`, RootNavigator swaps to role tree).
- **API endpoints:** `POST /api/v1/auth/login`; `POST /api/v1/auth/otp/send`.
- **States:** Local `idle|loading` + `LoadingOverlay`; errors via toast + inline `fieldErrors`. No `QueryState`.

### Register
- **Route / component:** `Register` — `src/screens/auth/RegisterScreen.tsx`
- **Role / access:** Public — creates `PLAYER` or `OWNER` only (no admin self-register).
- **Purpose:** New-account signup (name/email/phone/password + role + Terms consent).
- **Entry points:** "Register" link on Login; `navigate('Register')`.
- **Operations:** Select role (Player/Venue Owner); edit fields; toggle Terms; **Register**; Login link; live password checklist (display).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Register submit | No | Public | `validateName/Email/Phone/Password(≥8)` all pass AND `acceptedTerms`; role uppercased; 409 routed to phone/email field; skips welcome toast if pendingNav set |
  | Terms checkbox | No | Public | required (submit blocked w/ toast) |

- **Navigates to:** `Login` (post-`updateSession`, RootNavigator swaps to role tree).
- **API endpoints:** `POST /api/v1/auth/register`.
- **States:** Local `idle|loading` + `LoadingOverlay`; inline `fieldErrors`. No `QueryState`.

### OTPVerification
- **Route / component:** `OTPVerification` — `src/screens/auth/OTPVerificationScreen.tsx`
- **Role / access:** Public (completes login)
- **Purpose:** Verify the 6-digit login OTP (phone SMS OTP; delivered to a masked destination) and establish a session.
- **Entry points:** Only from Login "Continue with OTP" (`{email, maskedDestination, resendAfterSec, returnTo}`).
- **Operations:** Enter 6-digit code (paste/auto-advance/backspace); **Verify & Continue**; **Resend code** (when countdown 0).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Verify | No | Public | all 6 digits; requires `res.token`+`res.user`; clears + `Alert` on failure |
  | Resend | No | Public | blocked while `resendSec > 0` |

- **Navigates to:** None explicit (after `updateSession`, RootNavigator auto-routes to role home).
- **API endpoints:** `POST /api/v1/auth/otp/verify`; `POST /api/v1/auth/otp/send`.
- **States:** Local `loading`/`resending` + countdown; errors via `Alert`. No `QueryState`.

### ForgotPassword (three-step OTP reset)
- **Route / component:** `ForgotPassword` — `src/screens/auth/ForgotPasswordScreen.tsx` (registered in Auth, Guest, Admin, and player/owner shared lists)
- **Role / access:** Public; also reachable while authenticated from Security (`{fromSecurity:true}`).
- **Purpose:** Three-step email-OTP password reset. `type Step = 'email' | 'otp' | 'newPassword';`
- **Entry points:** "Forgot Password?" on Login; Security "Reset via Email OTP" (`{fromSecurity:true}`).
- **Operations / steps:**
  1. **`email`** — enter email → **Send Reset Code** (`RESEND_COOLDOWN = 45s`; enumeration-safe toast).
  2. **`otp`** — enter 6-digit code → **Verify Code** (stores `resetToken`); **Resend** (45s); copy "expires in 10 min" (`OTP_EXPIRY_SECS = 600`).
  3. **`newPassword`** — enter + confirm → **Reset Password** → navigate `Login` (or `goBack` if `fromSecurity`).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Send Reset Code | No | Public | non-empty email; starts 45s cooldown |
  | Verify Code | No | Public | `otp.length === 6`; 401/400→"Incorrect code"; requires `resetToken` |
  | Reset Password | No | Public | `meetsPolicy` (≥8, ≥1 letter, ≥1 digit) AND new===confirm |

- **Navigates to:** `Login` (or `goBack` when `fromSecurity`); steps are internal state.
- **API endpoints:** `POST /api/v1/auth/password-reset/request`; `POST /api/v1/auth/password-reset/verify`; `POST /api/v1/auth/password-reset/confirm`. *(Legacy `POST /api/v1/auth/forgot-password` exists but is unused here.)*
- **States:** mutation hooks; `busy` drives `LoadingOverlay` + buttons; errors via toast + inline. No `QueryState`.

---

## 3. Player screens

### Player Home (discovery feed) — reference QueryState screen
- **Route / component:** `Home` (player tab `HomeTab`) / `GuestHome` (guest tab) — `src/screens/player/PlayerHomeScreen.tsx`
- **Role / access:** Public (browse/search/detail are guest-viewable; favorite is auth-gated).
- **Purpose:** Landing discovery feed: search, sport filter, infinite-scroll nearby venues.
- **Entry points:** Default app screen for players/guests; post-login `pendingNav` resume; "Back to Home" buttons.
- **Operations:** Debounced search (400ms); sport chips (Cricket auto-selected); `FilterModal` (price/rating/sort); distance sort (once location resolves); enable-location strip; open VenueDetail; **toggle favorite**; pull-to-refresh; infinite scroll (page size 15); scroll-to-top.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Browse/search/filter/open detail | No | Public | — |
  | Toggle favorite | Yes | any (login gate) | guest → `navigate('Login')`; optimistic flip, rollback+toast on error |
  | Distance sort | No | Public | requires resolved `userLocation` |

- **Navigates to:** `VenueDetail`, `Login`; resume → `navigation.reset(['Home', dest])`.
- **API endpoints:** `GET /api/v1/venues` (`useInfiniteVenues`, `meta.suppressToast`); `GET /api/v1/sports`; `POST` / `DELETE /api/v1/venues/{id}/favorite`.
- **States:** **USES `QueryState`** for the venue feed (as `ListEmptyComponent`, `isEmpty`, empty "No venues found"); sports use `LoadingOverlay`; footer spinner for next page.

### Search [Orphaned]
- **Route / component:** `Search` — `src/screens/player/SearchScreen.tsx`
- **Role / access:** Public
- **Purpose:** Dedicated search (query + sport chips).
- **Entry points:** **(inferred)** ORPHANED — not in any navigator shared list, no `navigate('Search')` caller.
- **Operations:** Debounced search; sport chips; filter button (inert, no-op); open VenueDetail; pull-to-refresh.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Search / filter | No | Public | unfiltered until query/sport set |
  | Open VenueDetail | No | Public | — |

- **Navigates to:** `VenueDetail`, `goBack`.
- **API endpoints:** `GET /api/v1/venues` (`useVenues`); `GET /api/v1/sports`.
- **States:** `LoadingOverlay` + `EmptyState`; no error branch. No `QueryState`.

### Venue Details
- **Route / component:** `VenueDetail` (shared) — `src/screens/player/VenueDetailScreen.tsx`
- **Role / access:** Mode-driven via `route.params.mode`: `player` (default, public-viewable), `preview` (Owner), `review` (Admin).
- **Purpose:** Full venue detail (carousel, courts, amenities, map, reviews) with a mode-aware sticky bar.
- **Entry points:** VenueCard taps (Home/Search); admin review (`mode:'review'`); owner preview (`mode:'preview'`); `pendingNav` resume; deep link `scoreadda://venue/{id}`.
- **Operations:** View/refresh; carousel; map; share; directions; contact venue; **Book Now**; court tap → SlotSelection; view/write/edit review; (preview) Edit → EditVenue; (review) Approve/Reject/Send-back.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View venue | No | Public | player/preview use public detail; review uses admin detail |
  | Book Now / court tap | Yes | Player | guest → confirm modal → `setPendingNav({screen:'VenueDetail',...})` → `Login`; logged-in non-player → "Player Account Required"; disabled if `readOnly` |
  | Contact venue | Yes | any | guest → `setPendingNav({openContact:true})` → `Login`; only when `venue.contactAvailable` |
  | Write/Edit review | Yes | Player | `!readOnly && isLoggedIn && role==='player'` |
  | Approve/Reject/Send-back | Yes | Admin | `mode:'review'`; reject/send-back need reason |
  | Edit venue | Yes | Owner | `mode:'preview'` |

- **Navigates to:** `SlotSelection`, `VenueReviews`, `EditVenue`, `Login`, `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}` (player/preview); `GET /api/v1/admin/venues/{id}` (review); `GET /api/v1/venues/{id}/reviews`; `GET /api/v1/sports`; `POST /api/v1/venues/{id}/contact`; admin `PATCH /api/v1/venues/{id}/status`.
- **States:** `LoadingOverlay`; `isError||!venue` → `EmptyState "Venue not found"`. No `QueryState`.

### Check Slots / Slot Selection
- **Route / component:** `SlotSelection` (shared) — `src/screens/player/SlotSelectionScreen.tsx`
- **Role / access:** Player (gated upstream in VenueDetail; no in-screen auth check)
- **Purpose:** Pick sport → court → date → contiguous slots, then submit a booking **request** (bulk).
- **Entry points:** VenueDetail Book Now (`{venueId}`) / court tap (`{venueId, courtId, sportId}`).
- **Operations:** Sport tabs; court tabs (when >1); lazy date rail (batches of 10); toggle slots (contiguity/adjacency enforced; non-adjacent → `Alert "Adjacent slots only"`); past-slot greying; **Proceed to Book** → `BookingRequestModal` → submit; go to Bookings.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Reach screen | Yes (upstream) | Player (upstream) | gated by VenueDetail |
  | Select slot | — | — | `status==='available'` & not past; adjacent to current selection |
  | Submit booking | — | — | `selected.length > 0` |

- **Navigates to:** `Bookings` (tab), `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}`; `GET /api/v1/venues/{id}/courts`; `GET /api/v1/courts/{courtId}/slots`; `GET /api/v1/sports`; `POST /api/v1/bookings/bulk` (`useBulkCreateBooking`, suppressToast, invalidates `['bookings']`+`['slots']`).
- **States:** `LoadingOverlay`, `EmptyState` ("Venue not found"/"No slots available"), else `SlotGrid`. No `QueryState`.

### Booking Confirmation [Legacy/unreachable]
- **Route / component:** `BookingConfirm` (shared) — `src/screens/player/BookingConfirmScreen.tsx`
- **Role / access:** Player — registered but **no `navigate('BookingConfirm')` caller**; superseded by the bulk-request flow.
- **Purpose:** Single-slot confirmation: summary, coupon, payment method, price breakdown → Payment.
- **Entry points:** **(inferred)** none in-app.
- **Operations:** Apply coupon; select payment method; view price (base + convenienceFee − discount); Pay & Confirm → Payment.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Apply coupon | — | — | **[Not yet built]** backend; lists only `isActive` |
  | Proceed to Payment | Yes (upstream) | Player | always enabled |

- **Navigates to:** `Payment`, `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}`; `GET /api/v1/coupons`; `POST /api/v1/coupons/validate` (both **[Not yet built]**); platform settings (`usePlatformSettings`).
- **States:** no explicit loading/error; coupon failure via `Alert`. No `QueryState`.

### Payment [Legacy/unreachable]
- **Route / component:** `Payment` (shared) — `src/screens/player/PaymentScreen.tsx`
- **Role / access:** Player (legacy single-slot path)
- **Purpose:** Simulated payment; on "success" creates the booking → BookingSuccess.
- **Entry points:** From BookingConfirm "Pay & Confirm".
- **Operations:** Simulate Successful Payment → `useCreateBooking` → `replace('BookingSuccess')`; Simulate Failed Payment → modal; slot-conflict → `Alert "Slot Unavailable"`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Confirm booking | Yes (upstream) | Player | needs params; conflict surfaced via Alert |

- **Navigates to:** `BookingSuccess` (replace), `goBack`.
- **API endpoints:** `POST /api/v1/bookings` (`useCreateBooking`).
- **States:** in-place `ActivityIndicator`; `PaymentFailedModal`. No `QueryState`.

### Booking Success [Legacy, terminal]
- **Route / component:** `BookingSuccess` (shared) — `src/screens/player/BookingSuccessScreen.tsx`
- **Role / access:** Player (reached only via Payment)
- **Purpose:** Confirmation receipt (id, QR placeholder, summary).
- **Entry points:** From Payment `replace('BookingSuccess', {...})`.
- **Operations:** Display receipt; **View My Bookings**; **Back to Home**.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View receipt / navigate | Yes (upstream) | Player | terminal (no back) |

- **Navigates to:** `Bookings` (tab), `HomeTab` (tab).
- **API endpoints:** None (renders params).
- **States:** static. No `QueryState`.

### My Bookings
- **Route / component:** `BookingsHome` (tab `Bookings`) — `src/screens/player/MyBookingsScreen.tsx`
- **Role / access:** Player (auth required)
- **Purpose:** Tabbed list (Pending/Upcoming/Completed/Cancelled) with cancel/review/rebook/contact.
- **Entry points:** Bookings tab; children return here.
- **Operations:** Switch status tab; pull-to-refresh; **cancel single** (`CancelBookingModal`); **cancel group**; open BookingDetail; review → RateReview; rebook → VenueDetail; contact.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View list | Yes | Player | client filters: upcoming = future CONFIRMED; pending hides expired-pending; completed incl. legacy checked_in |
  | Cancel booking/group | Yes | Player | modal shows 50% refund (`amount*0.5`); group action on grouped cards |
  | Contact/Review/Rebook | Yes | Player | contact only on upcoming/completed |

- **Navigates to:** `BookingDetail`, `RateReview`, `VenueDetail`, `goBack`.
- **API endpoints:** `GET /api/v1/bookings`; `PATCH /api/v1/bookings/{id}/cancel`; `PATCH /api/v1/bookings/group/{groupId}/cancel`.
- **States:** `LoadingOverlay`; `EmptyState`; cancel errors via `Alert`. No `QueryState`.

### Booking Detail
- **Route / component:** `BookingDetail` (shared) — `src/screens/player/BookingDetailScreen.tsx`
- **Role / access:** Player (auth required)
- **Purpose:** Single-booking detail (id/QR, venue, slot, receipt) with cancel, conditional review, invoice.
- **Entry points:** From My Bookings (non-group card).
- **Operations:** pull-to-refresh; **cancel** → `goBack`; **Rate & Review** → RateReview; Download Invoice (confirm modal, no API).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View detail | Yes | Player | enabled only for valid positive id |
  | Cancel shown | Yes | Player | only when `status==='confirmed'`; 50% refund |
  | Rate & Review shown | Yes | Player | only when `status==='completed' && !hasReview` |

- **Navigates to:** `RateReview`, `goBack`.
- **API endpoints:** `GET /api/v1/bookings/{id}`; `PATCH /api/v1/bookings/{id}/cancel`.
- **States:** `LoadingOverlay`; `EmptyState "Booking not found"`. No `QueryState`.

### Rate & Review
- **Route / component:** `RateReview` (shared) — `src/screens/player/RateReviewScreen.tsx`
- **Role / access:** Player (auth required)
- **Purpose:** Create a venue rating + comment.
- **Entry points:** From My Bookings / Booking Detail (`{venueId}`).
- **Operations:** Set stars; comment (≤1000); submit → `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit | Yes | Player | rating ≥1; non-empty comment; 1000-char cap |
  | Completed-booking gate | — | — | NOT enforced here (only validates rating+comment); button-visibility gate lives in BookingDetail; any real gate is server-side |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}`; `POST /api/v1/venues/{id}/reviews`.
- **States:** `LoadingOverlay`; `EmptyState "Venue not found"`; submit failure via `Alert`. No `QueryState`.

### Venue Reviews (list)
- **Route / component:** `VenueReviews` (shared) — `src/screens/player/VenueReviewsScreen.tsx`
- **Role / access:** Player (list read-only/public-capable; write sheet gated on `isLoggedIn`)
- **Purpose:** Paginated reviews + rating summary + write/edit/delete sheet.
- **Entry points:** From VenueDetail rating summary / see-all.
- **Operations:** View paginated reviews; open `WriteReviewSheet`; create/edit/delete own review.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View reviews + summary | No | any/Player | valid positive venueId |
  | Submit review | Yes | Player | rating 1–5; comment 1–1000; no completed-booking check |
  | Delete review | Yes | Player | only when existing review present |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}/reviews`; `GET /api/v1/venues/{id}`; `GET /api/v1/venues/{id}/reviews/me`; `POST /api/v1/venues/{id}/reviews`; `PUT /api/v1/reviews/{reviewId}`; `DELETE /api/v1/reviews/{reviewId}`.
- **States:** `ActivityIndicator`; error text; `ReviewsEmptyState`; sheet errors via toast. No `QueryState`.

### Notifications (Player)
- **Route / component:** `Notifications` (shared) — `src/screens/player/NotificationsScreen.tsx`
- **Role / access:** Player (auth required)
- **Purpose:** Notification list with unread count + mark-read.
- **Entry points:** Header notification bell **(inferred)**.
- **Operations:** View list (polls 60s); pull-to-refresh; mark single read (if `!isRead`); mark all read (if `unreadCount>0`).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View / mark read | Yes | Player | mark-all only when `unreadCount>0` |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/notifications`; `PATCH /api/v1/notifications/{id}/read`; `PATCH /api/v1/notifications/read-all`.
- **States:** `LoadingOverlay`; `EmptyState`. No `QueryState`.

### Profile (Player hub)
- **Route / component:** `ProfileHome` (tab `Profile`) — `src/screens/player/PlayerProfileScreen.tsx`
- **Role / access:** Player
- **Purpose:** Account hub: summary, stats, menu links, logout.
- **Entry points:** Profile tab root.
- **Operations:** View profile/stats; pull-to-refresh; navigate EditProfile/Security/Notifications/Offers/Settings/HelpSupport; **logout** (confirm modal).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View / navigate / logout | Yes | Player | falls back to `useAuth().user` while `useMe` loads |

- **Navigates to:** `EditProfile`, `Security`, `Notifications`, `Offers`, `Settings`, `HelpSupport`.
- **API endpoints:** `GET /api/v1/users/me`.
- **States:** no loading/error UI (auth-context fallback); only refresh spinner. No `QueryState`.

### Security (hub)
- **Route / component:** `Security` (shared) — `src/screens/player/SecurityScreen.tsx`
- **Role / access:** Player (also reused by Owner/Admin nav)
- **Purpose:** Links to password change, email-OTP reset, email change (with status sub-labels).
- **Entry points:** Profile "Security".
- **Operations:** Change Password; Reset via Email OTP (`{fromSecurity:true}`); Change Email (sub-label by status); rejected box when status REJECTED.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Open sub-screens | Yes | Player | sub-label only when status ∈ {PENDING_VERIFICATION, PENDING} |

- **Navigates to:** `ChangePassword`, `ForgotPassword` (`{fromSecurity:true}`), `EmailChange`.
- **API endpoints:** `GET /api/v1/owner/email-change-requests/me` *(owner-namespaced from a player screen — flag)*.
- **States:** minimal; defensive `?.`. No `QueryState`.

### Change Password
- **Route / component:** `ChangePassword` (shared) — `src/screens/player/ChangePasswordScreen.tsx`
- **Role / access:** Player (reused by Owner/Admin nav)
- **Purpose:** Re-authenticated in-app password change.
- **Entry points:** Security "Change Password".
- **Operations:** Enter current/new/confirm; Forgot link; submit → on success `updateSession` (stays signed in), `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit | Yes | Player | current non-empty; new meets policy (≥8, ≥1 letter, ≥1 digit); confirm===new; 401→"Current password is incorrect"; 429→too many attempts |

- **Navigates to:** `ForgotPassword` (`{fromSecurity:true}`), `goBack`.
- **API endpoints:** `POST /api/v1/auth/change-password`.
- **States:** `LoadingOverlay`; field errors + toasts. No `QueryState`.

### Email Change
- **Route / component:** `EmailChange` (shared) — `src/screens/player/EmailChangeScreen.tsx`
- **Role / access:** Player (reused by Owner/Admin nav)
- **Purpose:** Self-service 3-step email change (submit → 6-digit OTP → applied).
- **Entry points:** Security "Change Email".
- **Operations:** newEmail step (send code, 60s cooldown); otp step (verify → `getMe` → `updateUser`); resend; auto-resume if PENDING_VERIFICATION; status banner; done → `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit new email | Yes | Player | regex `\S+@\S+\.\S+`; 409 → in-use/pending |
  | Verify OTP | Yes | Player | 6 digits; 401/400→"Incorrect code" |

- **Navigates to:** `goBack`.
- **API endpoints (OWNER-namespaced — flag):** `GET/POST /api/v1/owner/email-change-requests`; `POST /api/v1/owner/email-change-requests/verify`; post-verify `GET /api/v1/users/me`.
- **States:** `LoadingOverlay`; field errors + toasts. No `QueryState`.

### Phone Change
- **Route / component:** `PhoneChange` (shared) — `src/screens/player/PhoneChangeScreen.tsx`
- **Role / access:** Player (reused by Owner/Admin nav)
- **Purpose:** Self-service 3-step phone change; **OTP delivered to the registered email** (no SMS gateway for this flow).
- **Entry points:** From `EditProfile` read-only phone row (not Security).
- **Operations:** newPhone step (send code, 60s cooldown, "sent to your registered email"); otp step (verify → `getMe` → `updateUser`); resend; auto-resume if PENDING_VERIFICATION; done → `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit new phone | Yes | Player | `^\d{10}$`; 409 → "Phone already in use" |
  | Verify OTP | Yes | Player | 6 digits; OTP to registered email; 401/400→"Incorrect code" |

- **Navigates to:** `goBack`.
- **API endpoints (player-namespaced — correct):** `GET/POST /api/v1/users/me/phone-change-requests`; `POST /api/v1/users/me/phone-change-requests/verify`; post-verify `GET /api/v1/users/me`.
- **States:** `LoadingOverlay`; field errors + toasts. No `QueryState`.

### Offers / Coupons [Partial]
- **Route / component:** `Offers` / `OffersHome` (tab `OffersTab`) — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player
- **Purpose:** Browse active coupons/offers.
- **Entry points:** Offers tab; Profile "Offers & Coupons".
- **Operations:** List active coupons (client-filtered `isActive`); pull-to-refresh; display only (no apply).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | List coupons | Yes (auth'd API) | Player | only `isActive`; **backend not built → empty in practice** |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/coupons` **[Not yet built backend]**.
- **States:** `LoadingOverlay`; custom empty. No `QueryState`.

### Wallet [Not yet built]
- **Route / component:** `Wallet` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player **(inferred)** — static stub (also contradicts no-platform-payments model).
- **Purpose:** (Intended) wallet balance + transactions.
- **Entry points:** **(inferred)**.
- **Operations:** static balance ₹0; "Add Money" no-op.
- **Conditions / preconditions:** stub — no API, no real gates.
- **Navigates to:** `goBack`. **API endpoints:** none. **States:** none; no `QueryState`.

### Help & Support
- **Route / component:** `HelpSupport` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player **(inferred)** — static.
- **Purpose:** FAQ accordion + Contact Support mailto.
- **Operations:** Expand/collapse FAQ; Contact Support → `mailto:support@khelangan.com`.
- **Conditions / preconditions:** none (static; `Linking.canOpenURL` fallback toast).
- **Navigates to:** `goBack`; external mailto. **API endpoints:** none. **States:** static; no `QueryState`.

### Settings (Player)
- **Route / component:** `Settings` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player
- **Purpose:** Toggle push/email notifications; links to Security & Delete Account.
- **Entry points:** Profile "Settings".
- **Operations:** Toggle Push / Email (optimistic + rollback + toast); navigate Security; navigate DeleteAccount.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Toggle push/email | Yes | Player | Switch disabled while loading; rollback+toast on error |

- **Navigates to:** `Security`, `DeleteAccount`.
- **API endpoints:** `GET /api/v1/player/settings`; `PUT /api/v1/player/settings`.
- **States:** loading via disabled Switches; errors via toast. No `QueryState`.

### Edit Profile
- **Route / component:** `EditProfile` (player) / `OwnerEditProfile` (owner) / `AdminEditProfile` (admin) — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player (reused by Owner & Admin)
- **Purpose:** Edit name + avatar; entry to OTP-verified email/phone change.
- **Entry points:** Profile "Edit Profile" (each role).
- **Operations:** Load profile; pick avatar (permission, crop, q0.7); **Save** (upload avatar if new → update profile); Email & Phone fields **read-only** → navigate EmailChange / PhoneChange.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Pick image | Yes | any | media-library permission (Alert if denied) |
  | Save | Yes | any | name required; disabled unless `isDirty`; avatar uploaded before profile update |
  | Request email/phone change | Yes | any | routes out (fields not inline-editable) |

- **Navigates to:** `EmailChange`, `PhoneChange`, `goBack`.
- **API endpoints:** `GET /api/v1/users/me`; `POST /api/v1/users/me/avatar` (if new); `PUT /api/v1/users/me`.
- **States:** `LoadingOverlay`; `isError` → "Failed to load profile" + Retry; mutation errors via toast. No `QueryState`.

### Reschedule [Not yet built]
- **Route / component:** `Reschedule` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player **(inferred)** — stub.
- **Purpose:** (Intended) pick a new slot to reschedule.
- **Operations:** "Confirm Reschedule" → `goBack` (no effect; no API).
- **Conditions / preconditions:** stub.
- **Navigates to:** `goBack`. **API endpoints:** none. **States:** none; no `QueryState`.

### Dispute (Player raise)
- **Route / component:** `Dispute` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player (auth'd)
- **Purpose:** Raise a dispute against a booking.
- **Entry points:** From a booking detail passing `{bookingId}` **(inferred)**.
- **Operations:** Enter issue; submit → success Alert → `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit dispute | Yes | Player | non-empty `issue` AND a `bookingId` param |

- **Navigates to:** `goBack`.
- **API endpoints:** `POST /api/v1/disputes`.
- **States:** local `loading`; success/error Alert. No `QueryState`.

### Role Change
- **Route / component:** `RoleChange` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player or Owner (PLAYER↔OWNER switch)
- **Purpose:** Switch account role with password re-auth.
- **Entry points:** Profile/settings with `{targetRole}` **(inferred)**.
- **Operations:** Enter current password; confirm → `changeRole` → `updateSession` (RootNavigator re-routes).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Confirm switch | Yes | Player/Owner | non-empty password; response must include token+user |

- **Navigates to:** none (re-route via `updateSession`); header back.
- **API endpoints:** `PATCH /api/v1/users/me/role`.
- **States:** local `loading`; error Alert. No `QueryState`.

### Delete Account
- **Route / component:** `DeleteAccount` — `src/screens/player/MiscScreens.tsx`
- **Role / access:** Player (soft-delete of own account)
- **Purpose:** Self-service closure with password re-auth + optional reason.
- **Entry points:** Settings "Delete Account".
- **Operations:** Enter password (required) + reason; confirm Alert → `deleteMe` → toast → `logout()`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Delete account | Yes | Player | non-empty password; destructive confirm; success → logout; soft-delete frees email/phone, cancels upcoming bookings |

- **Navigates to:** none (`logout()` re-routes); header back.
- **API endpoints:** `DELETE /api/v1/users/me` (password+reason in body).
- **States:** `LoadingOverlay` + "Closing…"; errors via toast. No `QueryState`.

---

## 4. Owner screens

> None of the owner screens use the `QueryState` wrapper. Court-tier caps (2/2/4/6/12) are enforced **server-side** (`409 COURT_LIMIT_EXCEEDED`); the values come from plan `maxCourts` via `/api/v1/owner/subscription-plans`, not constants.

### Owner Dashboard
- **Route / component:** `DashboardHome` (tab `DashboardTab`) — `src/screens/owner/OwnerDashboardScreen.tsx`
- **Role / access:** Owner
- **Purpose:** Home hub: today's revenue, week/month earnings, booking counts, today's bookings, quick actions, subscription badge.
- **Entry points:** First owner tab; landing after owner login.
- **Operations:** View revenue hero + earnings cards; most-urgent subscription badge → `Subscription`; Quick Actions (Add Venue, Calendar, Earnings, Reviews, Requests); Calendar quick action (0 venues→Alert, 1→VenueCalendar, >1→picker modal); booking stat cards → `OwnerBookings` w/ `initialTab`; today's bookings **check-in** (single/group); pull-to-refresh; notification bell.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Load summary | Yes | Owner | — |
  | Calendar quick action | Yes | Owner | `venueCount>0` else Alert; picker only if >1 |
  | Check-in | Yes | Owner | today's bookings (CONFIRMED, date=today) |
  | Subscription badge | Yes | Owner | only when a venue has a `subscriptionBadge` |

- **Navigates to:** `Subscription`, `EarningsTab`, `AddVenue`, `VenueCalendar`, `ReviewsManagement`, `OwnerBookingsHome`, `VenuesTab`.
- **API endpoints:** `GET /api/v1/owner/dashboard/summary`; `GET /api/v1/owner/venues`; `GET /api/v1/bookings?status=CONFIRMED&date=<today>`; `PATCH /api/v1/bookings/{id}/check-in`; `POST /api/v1/bookings/group/{groupId}/check-in`.
- **States:** per-section `ActivityIndicator`/skeletons; inline error banner + Retry; empty "No bookings scheduled for today". No `QueryState`.

### My Venues + Venue list / submit
- **Route / component:** `VenuesHome` (tab `VenuesTab`) — `src/screens/owner/MyVenuesScreen.tsx`
- **Role / access:** Owner
- **Purpose:** List owner's venues; submit/resubmit for approval; manage entries.
- **Entry points:** Venues tab; Dashboard "My venues"/"Courts"; Profile "My Venues".
- **Operations:** Add Venue; per-venue card (status, courts, rating, days on platform); **Submit/Resubmit for approval** (`draft`/`changes_requested`); tier-selection modal when `courtCount > 2` (plan must satisfy `maxCourts ≥ courtCount`); subscription strip (live only); per-card Courts/Calendar/Edit/Preview; pull-to-refresh.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Submit for approval | Yes | Owner | status `draft`/`changes_requested`; if `courtCount>2`, pick plan with `maxCourts≥courtCount` first (passes `planId`) |
  | Subscription strip | Yes | Owner | only when `status==='live'` |
  | Courts/Calendar/Edit/Preview | Yes | Owner | per venue |

- **Navigates to:** `AddVenue`, `CourtManagement`, `VenueCalendar`, `EditVenue`, `VenueDetail` (`mode:'preview'`).
- **API endpoints:** `GET /api/v1/owner/venues`; `POST /api/v1/owner/venues/{id}/submit` (optional `planId`); `GET /api/v1/owner/subscription-plans`.
- **States:** `LoadingOverlay`; `EmptyState "No venues yet"`; toasts on submit. No `QueryState`.

### Add Venue (Create) — 7-step wizard
- **Route / component:** `AddVenue` (shared) — `src/screens/owner/AddVenueScreen.tsx`
- **Role / access:** Owner
- **Purpose:** Create a venue (saved as DRAFT) with images.
- **Entry points:** Dashboard "Add Venue"; MyVenues "+ Add".
- **Operations:** 7 steps (Basic Info, Address, Contact, Sports, Hours, Pricing, Photos) with per-step validation; toggle sports/amenities; hour pickers; Active switch; pick ≤3 images (16:9, starred = cover); **Save** (upload images → create) → success modal → "Add Courts" (`replace('CourtManagement')`).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Advance step | Yes | Owner | step validation (name; address+city, pincode 6-digit, lat/lng parseable; phone `^[6-9]\d{9}$`, optional email; ≥1 sport; close>open; price≥0) |
  | Save venue | Yes | Owner | all steps valid; images upload OK |

- **Navigates to:** `CourtManagement` (replace), `goBack`.
- **API endpoints:** `GET /api/v1/sports`; `POST /api/v1/venues/images/upload`; `POST /api/v1/venues`.
- **States:** local `loading`; submit failure via `Alert`. Info box: live on a **30-day free trial once approved**. No `QueryState`.

### Edit Venue (Update)
- **Route / component:** `EditVenue` (shared) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** Single-form edit of an existing venue.
- **Entry points:** MyVenues "Edit".
- **Operations:** Prefill; edit all venue fields; photos add/remove/reorder/replace; **Save** → `goBack`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Save changes | Yes | Owner | same validation as AddVenue |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}`; `GET /api/v1/sports`; `POST /api/v1/venues/images/upload`; `PUT /api/v1/venues/{id}`.
- **States:** `LoadingOverlay` until prefilled; save failure via `Alert`. No `QueryState`.

> **Venue "Read"/"Delete":** Read uses the shared `VenueDetail` (`mode:'preview'`). There is **no owner-facing venue-delete** operation in code (venues are unlisted/archived via admin moderation). **(flag)**

### Court Management (Court CRUD)
- **Route / component:** `CourtManagement` (shared) — `src/screens/owner/CourtManagementScreen.tsx`
- **Role / access:** Owner
- **Purpose:** CRUD courts within a venue with hours/price inheritance + plan court-limit handling.
- **Entry points:** MyVenues "Courts"; AddVenue success "Add Courts".
- **Operations:** List courts; **Create** / **Edit** / **Delete** (confirm: slots cascade); form fields (name req, type, sport req, use-venue-hours/price toggles, Active toggle); court-limit handling via `extractCourtLimit` → Upgrade toast.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Create court | Yes | Owner | form valid; **blocked at plan cap** → `409 COURT_LIMIT_EXCEEDED` → toast w/ Upgrade action |
  | Edit court | Yes | Owner | custom hours within venue window; custom price ≥0 |
  | Delete court | Yes | Owner | confirm; cascades to slots |

- **Navigates to:** `Subscription` (via Upgrade toast), `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}/courts`; `POST /api/v1/venues/{id}/courts`; `PUT /api/v1/venues/{id}/courts/{courtId}`; `DELETE /api/v1/venues/{id}/courts/{courtId}`; `GET /api/v1/venues/{id}`; `GET /api/v1/sports`.
- **States:** `LoadingOverlay`; `EmptyState "No courts yet"`; court-limit toast. No `QueryState`.

### Venue Calendar (slot blocking)
- **Route / component:** `VenueCalendar` (shared) — `src/screens/owner/VenueCalendarScreen.tsx`
- **Role / access:** Owner
- **Purpose:** Per-venue slot calendar; view/block availability by court/date.
- **Entry points:** Dashboard Calendar (+ picker), MyVenues "Calendar".
- **Operations:** Court tabs; infinite date rail; view `SlotGrid`; select available slots; **Block selected** (1 → block-by-time; many → block-selected); **Bulk Block** (header → confirm).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View slots | Yes | Owner | venue has ≥1 court (else EmptyState) |
  | Toggle slot | Yes | Owner | slot `status==='available'` |
  | Block selected / bulk | Yes | Owner | ≥1 selected / confirm modal |

- **Navigates to:** `VenuesTab`, `goBack`.
- **API endpoints:** `GET /api/v1/venues/{id}`; `GET /api/v1/courts/{courtId}/slots?date`; `PATCH /api/v1/courts/{courtId}/slots/block-by-time`; `POST /api/v1/courts/{courtId}/slots/block-selected`; `POST /api/v1/courts/{courtId}/slots/bulk-block`.
- **States:** `LoadingOverlay`; distinct empty/error states; block errors via `Alert`. No `QueryState`.

### Bookings Management (tabs)
- **Route / component:** `OwnerBookingsHome` (tab `OwnerBookings`) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** Tabbed bookings management with accept/reject/check-in.
- **Entry points:** Bookings tab; Dashboard stat cards & "Requests" (pass `initialTab`).
- **Operations & per-tab gates:**

  | Tab | Query | Allowed operations |
  |---|---|---|
  | **Requests** | `status=PENDING` (expired-pending filtered via 24h `isExpiredPending`) | Accept/Reject (group inline; single via detail) |
  | **Today** | `status=CONFIRMED&date=today` | **Check-in** (single/group); show contact |
  | **Upcoming** | `status=CONFIRMED&dateFrom=tomorrow` | view only; show contact |
  | **Completed** | `status=COMPLETED` + `status=CHECKED_IN` (merged/de-duped) | view only; show contact |
  | **Cancelled** | `status=CANCELLED` + `status=PENDING` (expired) | view only |

  Manual refresh (12s cooldown) + pull-to-refresh; tap single card → `OwnerBookingDetail`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Accept/Reject | Yes | Owner | **Requests** tab only |
  | Check-in | Yes | Owner | **Today** tab only |
  | Refresh | Yes | Owner | disabled while loading/cooldown |

- **Navigates to:** `OwnerBookingDetail`, `goBack`.
- **API endpoints:** `GET /api/v1/bookings` (per-tab params); `POST /api/v1/bookings/group/{groupId}/accept`|`/reject`; `PATCH /api/v1/bookings/{id}/check-in`; `POST /api/v1/bookings/group/{groupId}/check-in`.
- **States:** `LoadingOverlay`; `EmptyState`; refresh bar. No `QueryState`.

### Owner Booking Detail
- **Route / component:** `OwnerBookingDetail` (shared) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** Single booking detail with earnings breakdown and lifecycle actions.
- **Entry points:** BookingManagement (single card); Notifications "View".
- **Operations:** View detail (amount, **platform commission**, "Your Earning"); **Accept/Reject** (`pending`; reject confirm); **Mark Checked-In** (`confirmed`).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Accept/Reject | Yes | Owner | `status==='pending'` |
  | Mark Checked-In | Yes | Owner | `status==='confirmed'` |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/bookings/{id}`; `PATCH /api/v1/bookings/{id}/accept`|`/reject`|`/check-in`.
- **States:** `LoadingOverlay`; check-in failure via `Alert`. No `QueryState`. *(commission/earning model — flag.)*

### Earnings
- **Route / component:** `EarningsHome` (tab `EarningsTab`) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** Earnings summary (month/week/pending) + payout history. *(legacy commission model — flag.)*
- **Entry points:** Earnings tab; Dashboard cards; Profile "Bank & Payouts".
- **Operations:** View month/week/pending; list payout history; pull-to-refresh (read-only).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View earnings/payouts | Yes | Owner | — |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/owner/stats`; `GET /api/v1/owner/payouts`.
- **States:** renders defaults (₹0); pull-to-refresh. No `QueryState`.

### Reviews Management (Owner)
- **Route / component:** `ReviewsManagement` (shared) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** List reviews across the owner's venues (read-only).
- **Entry points:** Dashboard "Reviews".
- **Operations:** View reviews; pull-to-refresh.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View reviews | Yes | Owner | — |

- **Navigates to:** `goBack`.
- **API endpoints:** `GET /api/v1/owner/reviews`.
- **States:** `LoadingOverlay`; `ReviewsEmptyState`. No `QueryState`.

### Subscription / Plan (Owner)
- **Route / component:** `Subscription` (shared) — `src/screens/owner/OwnerScreens.tsx`
- **Role / access:** Owner
- **Purpose:** Per-venue subscription: current plan, courts used, features, pending change request, upgrade, history.
- **Entry points:** Dashboard subscription badge (`{venueId}`); Profile "Subscription"; CourtManagement Upgrade toast.
- **Operations:** Venue switcher (>1); view plan (`PlanBadge`, status, period, trial-end, **courtsUsed/courtsAllowed**, features); lapsed banner (PAST_DUE/EXPIRED); pending change-request box (`PlanComparison`); **Upgrade/change** (Monthly/Annual) → request; history.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View plan | Yes | Owner | venue selected; "No active subscription" if none (admin must activate) |
  | Upgrade/change request | Yes | Owner | no pending request; chosen plan ≠ current |

- **Navigates to:** `goBack` (upgrade is request-only, admin-activated).
- **API endpoints:** `GET /api/v1/owner/venues`; `GET /api/v1/owner/venues/{id}/subscription`; `GET /api/v1/owner/subscription-plans`; `POST /api/v1/owner/venues/{id}/subscription/upgrade-requests`.
- **States:** `ActivityIndicator`; `EmptyState`. No in-app payment (offline/admin-activated). No `QueryState`.

### Owner Profile / Notifications / Settings
- **Owner Profile** — `OwnerProfileHome` (tab `OwnerProfileTab`): hub; navigates `OwnerEditProfile`, `Security`, `VenuesTab`, `Subscription`, `EarningsTab`, `OwnerNotifications`, `OwnerSettings`; **logout** (confirm). API: `GET /api/v1/users/me`. No `QueryState`.
- **Owner Notifications** — `OwnerNotifications`: list + mark read/all; **inline Accept/Reject** for unread "New Booking Request" whose slot hasn't passed (single vs group by `referenceType`); refetch on focus + 30s tick. API: `GET /api/v1/notifications`; `PATCH /api/v1/notifications/{id}/read`; `PATCH /api/v1/notifications/read-all`; `PATCH /api/v1/bookings/{id}/accept|reject`; `POST /api/v1/bookings/group/{groupId}/accept|reject`.
  - Gate: inline accept/reject requires `type==='booking'`, `referenceId`, title "New Booking Request", unread, **slot not passed**.
- **Owner Settings** — `OwnerSettings`: toggle **Auto-accept bookings** + **Push Notifications** (switches disabled while pending). API: `GET /api/v1/owner/settings`; `PUT /api/v1/owner/settings`. No `QueryState`.

---

## 5. Admin screens

> Admin uses a single stack (`AdminNavigator`). Detail screens render their action bars purely from the server's `availableActions`; **BAN/UNBAN/DELETE appear only for Super-admin** (server strips `HARD_ACTIONS` for SUPPORT, returns empty for READ_ONLY; legacy null `adminRole` ⇒ SUPER_ADMIN). No admin screen uses `QueryState`.

### Admin Dashboard
- **Route / component:** `AdminDashboard` (initial route) — `src/screens/admin/AdminDashboardScreen.tsx`
- **Role / access:** Admin (financial sections gated by server `summary.canViewFinancials`)
- **Purpose:** Operations home — MRR hero, period metrics, "Needs Attention" deep links, management tile grid.
- **Entry points:** First screen after admin login.
- **Operations:** Period toggle TODAY/WEEK/MONTH; pull-to-refresh; MRR hero → `SubscriptionManagement`; metric cards → `Venues`/`Players`/`AdminBookings`; needs-attention item → server `deepLinkScreen`; management tiles; header bell → `Notifications`; avatar → `AdminProfile`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | View dashboard | Yes | Admin | — |
  | See MRR/GBV | Yes | Admin | `summary.canViewFinancials` true & metric present |

- **Navigates to:** `AdminProfile`, `Notifications`, `SubscriptionManagement`, `Venues`, `Players`, `OwnerManagement`, `AdminBookings`, `DisputeManagement`, `CouponManagement`, `PaymentsRevenue`, `Analytics`, `NotificationBroadcast`, `CategoryManagement`, `CMS`, + needs-attention deep links.
- **API endpoints:** `GET /api/v1/admin/dashboard/summary?period`.
- **States:** "Loading dashboard…" / "Could not load dashboard." + RefreshControl. No `QueryState`.

### Venues registry + approval (CHANGES_REQUESTED)
- **Route / component:** `Venues` (canonical) + aliases `VenueApproval`, `VenueManagement` → `src/screens/admin/AdminVenuesScreen.tsx`
- **Role / access:** Admin (browse only; actions on detail)
- **Purpose:** Tabbed, searchable, infinite venue list with status filters + count badges.
- **Entry points:** Dashboard cards/tile; legacy alias routes.
- **Operations:** Tabs `ALL/PENDING/CHANGES_REQUESTED/APPROVED/REJECTED` (seedable via `route.params.tab`); debounced search (300ms); infinite scroll; tap → `VenueDetail`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | List venues / counts | Yes | Admin | counts show `pending` & `changesRequested` |

- **Navigates to:** `VenueDetail`.
- **API endpoints:** `GET /api/v1/admin/venues` (page/size/status/q); `GET /api/v1/admin/venues/counts`; `GET /api/v1/sports`.
- **States:** `ActivityIndicator`; `EmptyState`; footer spinner. No `QueryState`.

### Admin Venue Detail (moderation)
- **Route / component:** `VenueDetail` (admin stack) — `src/screens/admin/AdminVenueDetailScreen.tsx`
- **Role / access:** Admin (action set from `detail.availableActions`)
- **Purpose:** Full venue review with sticky moderation action bar.
- **Entry points:** AdminVenuesScreen, OwnerDetail venues tab, Subscriptions.
- **Operations (from `availableActions`):** `APPROVE`→LIVE (confirm; owner then starts trial & picks courts); `REJECT`→REJECTED (reason); `SEND_BACK`→CHANGES_REQUESTED (reason); `RECONSIDER`→PENDING; `UNLIST`→SUSPENDED; `RELIST`→LIVE; `EDIT` (stub toast **[Partial]**); call/email owner; "Manage subscription →" → `SubscriptionDetail`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Any moderation action | Yes | Admin (server filters by sub-role) | action ∈ `availableActions`; READ_ONLY → bar hidden |
  | Reject / Send back | Yes | Admin | non-empty reason |
  | Approve | Yes | Admin | confirm; hands off to owner trial/court selection |

- **Navigates to:** `SubscriptionDetail`; external tel/mail.
- **API endpoints:** `GET /api/v1/admin/venues/{id}`; `PATCH /api/v1/venues/{id}/status` (`{status, rejectionReason}`); `GET /api/v1/admin/venues/{id}/subscription`; `GET /api/v1/sports`.
- **States:** `ActivityIndicator`; `EmptyState "Could not load"`; mutations via toast. No `QueryState`.

### Players management
- **Route / component:** `Players` + alias `PlayerManagement` → `src/screens/admin/AdminPlayersScreen.tsx`
- **Role / access:** Admin
- **Purpose:** Scaled player directory — KPI strip, search, segment + sort chips, infinite list.
- **Entry points:** Dashboard "New signups"; Players tile; legacy alias.
- **Operations:** Search; segment (`ALL/NEW/ACTIVE/DORMANT/FLAGGED/RESTRICTED`); sort; infinite scroll; tap → `PlayerDetail`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | List / stats | Yes | Admin | — |

- **Navigates to:** `PlayerDetail`.
- **API endpoints:** `GET /api/v1/admin/players` (q/segment/sort/page/size); `GET /api/v1/admin/players/stats`.
- **States:** spinner / search-aware `EmptyState`; footer spinner. No `QueryState`.

### Player Detail (360 + moderation)
- **Route / component:** `PlayerDetail` — `src/screens/admin/PlayerDetailScreen.tsx`
- **Role / access:** Admin; **BAN/UNBAN/DELETE = Super-admin only**.
- **Purpose:** Player 360 (identity + verify toggles, stats, Bookings/Payments/Audit tabs) with action bar.
- **Entry points:** AdminPlayersScreen; DisputeDetail party card.
- **Operations (gated by `availableActions`):** `SUSPEND` (reason), `BAN` (reason, **super-admin**), `DELETE` (reason, **super-admin**), `REACTIVATE`, `UNBAN` (**super-admin**), `FORCE_LOGOUT`, `RESET_PASSWORD`, `MESSAGE` (IN_APP/EMAIL/SMS), `VERIFY` (email/phone toggles).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Suspend/Reactivate/Force-logout/Reset/Message | Yes | Admin (SUPPORT+) | action ∈ `availableActions` |
  | Ban / Unban / Delete | Yes | **Super-admin** | present only for super-admin; reason for ban/delete |
  | Verify toggle | Yes | Admin | `availableActions` includes `VERIFY` |

- **Navigates to:** none (modals only); external tel/mail.
- **API endpoints (under `/api/v1/admin/players`):** `GET /{id}`; `POST /{id}/suspend|reactivate|ban|unban|verification|force-logout|reset-password|message`; `DELETE /{id}`; `GET /{id}/bookings|payments|audit`.
- **States:** detail spinner / "Could not load"; per-section spinners + "Load more"; DELETED banner. No `QueryState`.

### Owners management
- **Route / component:** `Owners` + alias `OwnerManagement` → `src/screens/admin/AdminOwnersScreen.tsx`
- **Role / access:** Admin
- **Purpose:** Supply-side directory — KPI strip, search, segments (incl. `ONBOARDING`), sort, infinite list, Call/WhatsApp chooser.
- **Entry points:** Owners tile.
- **Operations:** Search; segment (`ALL/NEW/ONBOARDING/ACTIVE/DORMANT/FLAGGED/RESTRICTED`); sort; infinite scroll; tap → `OwnerDetail`; contact (tel / `wa.me`).
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | List / stats | Yes | Admin | — |
  | Contact chooser | — | — | owner has a phone |

- **Navigates to:** `OwnerDetail`; external tel/WhatsApp.
- **API endpoints:** `GET /api/v1/admin/owners` (q/segment/sort/page/size); `GET /api/v1/admin/owners/stats`.
- **States:** spinner / `EmptyState`; footer spinner. No `QueryState`.

### Owner Detail (360 + moderation cascade)
- **Route / component:** `OwnerDetail` — `src/screens/admin/OwnerDetailScreen.tsx`
- **Role / access:** Admin; **BAN/UNBAN/DELETE = Super-admin only**.
- **Purpose:** Owner 360 (identity + verify, stats incl. disputes, Venues/Subscriptions/Bookings/Audit tabs) with moderation cascade.
- **Entry points:** AdminOwnersScreen; DisputeDetail party card.
- **Operations (gated by `availableActions`):** `SUSPEND` (reason; unlists live venues), `BAN` (reason + optional `cancelUpcomingBookings`, **super-admin**), `DELETE` (reason; archives venues, cancels upcoming bookings — players notified, no platform refund, voids subscriptions, **super-admin**), `REACTIVATE`, `UNBAN` (**super-admin**), `FORCE_LOGOUT`, `RESET_PASSWORD`, `MESSAGE`, `VERIFY`. Sub-tabs → `VenueDetail` / `SubscriptionDetail`.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Suspend/Reactivate/Force-logout/Reset/Message | Yes | Admin (SUPPORT+) | action ∈ `availableActions` |
  | Ban / Unban / Delete | Yes | **Super-admin** | reason (ban/delete); ban offers cancel-upcoming toggle |

- **Navigates to:** `VenueDetail`, `SubscriptionDetail`.
- **API endpoints (under `/api/v1/admin/owners`):** `GET /{id}`; `GET /{id}/venues|subscriptions|bookings|audit`; `POST /{id}/suspend|reactivate|ban|unban|verification|force-logout|reset-password|message`; `DELETE /{id}`.
- **States:** detail spinner / "Could not load"; per-section spinners; DELETED banner w/ cascade counts. No `QueryState`.

### Disputes (triage) + Dispute Detail
- **Disputes** — `Disputes` + alias `DisputeManagement` → `src/screens/admin/DisputesScreen.tsx`: SLA KPI strip; multi-select status/category filters; priority/assignee/sort; infinite list w/ overdue badges; tap → `DisputeDetail`. API: `GET /api/v1/admin/disputes` (q/status[]/category[]/priority/assigned/sort); `GET /api/v1/admin/disputes/stats`. No `QueryState`.
- **Dispute Detail** — `DisputeDetail` → `src/screens/admin/DisputeDetailScreen.tsx`: actions from `availableActions` — `ASSIGN`, `MESSAGE` (PLAYER/OWNER/BOTH), `REQUEST_INFO`, `ADD_NOTE` (internal), `RESOLVE` (outcome + at-fault + ruling note req + optional recommended refund [no-refund model: "platform does not process this"] + optional consequence WARN/FLAG/SUSPEND/BAN), `DISMISS` (reason), `REOPEN` (reason). Navigates `AdminBookings`, `PlayerDetail`, `OwnerDetail`.
  - **Conditions:** all actions require `action ∈ availableActions`; Resolve needs ruling note (+ consequence reason if set); Dismiss/Reopen need a reason.
  - API (under `/api/v1/admin/disputes`): `GET /{id}`; `POST /{id}/assign|message|request-info|notes|resolve|dismiss|reopen`. No `QueryState`.

### Subscriptions overview + detail
- **Subscription Management** — `SubscriptionManagement` → `src/screens/admin/AdminSubscriptionScreens.tsx`: three tabs — **Activate** (venue-subscription table: search, status `ALL/ACTIVE/TRIAL/EXPIRING/EXPIRED`, infinite, call owner, View → `SubscriptionDetail`), **Requests** (filter PENDING/APPROVED/REJECTED, go-to-Venue, Review → `SubscriptionDetail`), **Plans** (edit priceMonthly/priceAnnual/maxCourts/photoLimit/active). API: `GET /api/v1/admin/venue-subscriptions`; `GET /api/v1/admin/subscription-change-requests`; `GET /api/v1/admin/subscription-plans`; `PUT /api/v1/admin/subscription-plans/{id}`. No `QueryState`.
- **Subscription Detail** — `SubscriptionDetail` (same file): if sub exists → **Renew** / **Change plan** / **Suspend (void)**; if none → **CreateSubscriptionForm** (plan + cycle + "Activate as trial", `paymentMethod:'CASH'`); pending change-request → court-coverage editor + **Approve (cash received)** → activate w/ courtIds (offline-payment activation) or **Reject** (reason). 
  - **Conditions:** Renew/Change/Suspend require an existing sub; Create requires none; Approve needs ≥1 court (offline cash); Reject needs reason.
  - API: `GET /api/v1/admin/venues/{venueId}/subscription`; `GET /api/v1/admin/subscription-plans`; `POST /api/v1/admin/subscriptions`; `PUT /api/v1/admin/subscriptions/{id}`; `DELETE /api/v1/admin/subscriptions/{id}`; `POST /api/v1/admin/subscriptions/{id}/renew`; `GET /api/v1/admin/subscription-change-requests/{id}/selectable-courts`; `POST /api/v1/admin/subscription-change-requests/{id}/activate`; `POST /api/v1/admin/subscription-change-requests/{id}/reject`. No `QueryState`.

### Sports management (CategoryManagement)
- **Route / component:** `CategoryManagement` (titled "Sports") — `src/screens/admin/AdminScreens.tsx`
- **Role / access:** Admin
- **Purpose:** Add / Edit / Delete sports (name + emoji icon).
- **Entry points:** Sports tile.
- **Operations:** Add / Edit / Delete sport (confirm); pull-to-refresh.
- **Conditions / preconditions:**

  | Operation | Requires auth | Role | Other conditions |
  |---|---|---|---|
  | Create / Update sport | Yes | Admin | name + icon required |
  | Delete sport | Yes | Admin | confirm (warns affected venues) |

- **Navigates to:** none.
- **API endpoints:** `GET /api/v1/sports`; `POST /api/v1/admin/sports`; `PUT /api/v1/admin/sports/{id}`; `DELETE /api/v1/admin/sports/{id}`.
- **States:** `LoadingOverlay`; `EmptyState`; Alert on error. No `QueryState`.

### Other admin screens (AdminScreens.tsx)
- **Admin Bookings** — `AdminBookings`: flat read-only list; pull-to-refresh. API: `GET /api/v1/admin/bookings`. [Basic/legacy]
- **Payments & Revenue** — `PaymentsRevenue`: payout queue; **Process Payout** when `status==='pending'`. API: `GET /api/v1/admin/payouts`; `POST /api/v1/admin/payouts/{id}/process`. [Basic/legacy — commission model flag]
- **Coupon Management** — `CouponManagement` **[Partial]**: list + create (code, PERCENT/FLAT, value, minBooking, maxUses, hardcoded `validUntil`); no edit/delete UI; **backend not built**; known field-case mismatch (`'percent'` vs `'PERCENT'`). API: `GET /api/v1/admin/coupons`; `POST /api/v1/admin/coupons`.
- **Notification Broadcast** — `NotificationBroadcast`: title + message + audience `ALL/PLAYERS/OWNERS`; Send (validates non-empty). API: `POST /api/v1/admin/notifications/broadcast`.
- **Analytics** — `Analytics` **[Not built — placeholder]** (`EmptyState "Coming soon"`).
- **CMS** — `CMS` **[Not built — placeholder]**.
- **Admin Settings** — `AdminSettings`: edit commission %, convenience fee, maintenance mode, **auto-approve venues**; Save. API: `GET /api/v1/admin/settings`; `PUT /api/v1/admin/settings`. *(commission/fee — flag.)*

### Admin Profile (hub) + reused screens
- **Admin Profile** — `AdminProfile` → `src/screens/admin/AdminProfileScreen.tsx`: links to `AdminEditProfile` (reused EditProfileScreen), `EmailChange`, `AdminChangePassword` (reused ChangePasswordScreen), `AdminSettings`; **logout** (confirm). No direct API (delegates).
- **Reused player screens in `AdminNavigator`:** `AdminEditProfile`, `AdminChangePassword`, `EmailChange`, `PhoneChange`, `ForgotPassword`, `Notifications` — documented in §2/§3.

---

## 6. Global conditions matrix

| Condition | Applies to | Behavior when unmet |
|---|---|---|
| **Authenticated user** | Booking (Book Now / slot submit), favorites, all player profile/settings, all owner & admin areas | Guest action → `setPendingNav(...)` + `navigate('Login')`; after auth `consumePendingNav()` resumes. Owner/admin areas are simply not mounted (RootNavigator routes by role). |
| **Player role** | Book Now, write review, toggle favorite | Logged-in non-player on Book Now → Alert "Player Account Required"; review/favorite UI hidden for non-players. |
| **Owner role** | Venue CRUD, Court CRUD, slot blocking, owner bookings/earnings/subscription | Screens only exist in `OwnerTabNavigator`; not reachable by other roles. |
| **Admin role** | All `/api/v1/admin/*` screens | Screens only in `AdminNavigator`. |
| **Super-admin** | Ban / Unban / Delete (player & owner) | Server omits `BAN/UNBAN/DELETE` from `availableActions`; the action button is not rendered. READ_ONLY → empty action bar. |
| **Server `availableActions`** | All admin detail screens (venue/player/owner/dispute moderation) | Any action absent from the list is hidden; reason-required actions block submit until a reason is entered. |
| **Plan court-limit (2/2/4/6/12)** | Owner Add Court; venue submit when `courtCount>2` | Add Court → `409 COURT_LIMIT_EXCEEDED` → toast w/ Upgrade → `Subscription`. Submit → must pick a plan whose `maxCourts ≥ courtCount`. |
| **Subscription status** | Player-visible venue listing; owner Subscription screen | PAST_DUE/EXPIRED hides the venue from players + lapsed banner ("contact admin to renew"). No active sub → "No active subscription" (admin must activate). |
| **Venue status** | Owner submit; admin moderation; player visibility | Submit only for `draft`/`changes_requested`; `SEND_BACK` → `CHANGES_REQUESTED`; only `LIVE` venues show the subscription strip / are bookable. |
| **Booking state** | Owner accept/reject/check-in; player cancel/review | Accept/Reject only `pending` (Requests tab); Check-in only `confirmed` (Today tab); player Cancel only `confirmed`; Review only `completed && !hasReview`. |
| **Slot availability** | Player slot selection; owner slot block | Only `available`, non-past slots selectable; player selection must be adjacent/contiguous. |
| **Network / backend down** | All data screens | Only `PlayerHomeScreen` shows the standardized inline `QueryState` error+retry; others show bespoke `LoadingOverlay`/`EmptyState`/`Alert`. A failed cold-start session restore shows a full-screen retry overlay (does NOT log out unless 401/403). |
| **OTP cooldowns / expiry** | Login OTP, forgot-password, email/phone change | Resend blocked during cooldown (login param; reset 45s; email/phone 60s); reset OTP expires in 10 min. |

---

## 7. Key flow diagrams (text)

### 7.1 Player books a slot (auth-gate + returnTo/pendingNav)
1. Player opens **Home** (`Home`/`GuestHome`) → taps a VenueCard → **VenueDetail** (`mode:'player'`).
2. Taps **Book Now** (or a court).
   - **If guest:** `ConfirmActionModal` → `setPendingNav({ screen:'VenueDetail', params:{ venueId, _successToast } })` → `navigate('Login')`.
     - Login (or Continue with OTP → **OTPVerification**) → `updateSession` → RootNavigator swaps to Player tree → **PlayerHome** `useFocusEffect` calls `consumePendingNav()` → `navigation.reset(['Home', {VenueDetail}])` → back at VenueDetail. Continue.
   - **If logged-in non-player:** Alert "Player Account Required" → stop.
3. **SlotSelection**: pick sport → court (if >1) → date → contiguous available slots (adjacency enforced).
4. **Proceed to Book** → `BookingRequestModal` → confirm → `POST /api/v1/bookings/bulk` (status starts `PENDING`).
5. Success → navigate to **Bookings** tab (`BookingsHome`). Booking awaits owner Accept/Reject.
   - *(Legacy single-slot path `BookingConfirm → Payment → BookingSuccess` exists in code but is unreachable.)*

### 7.2 Owner adds a venue then a court (plan court-limit)
1. Owner **Dashboard** or **MyVenues** → **AddVenue** (7-step wizard).
2. Complete steps (validation per step) → **Save** → `POST /api/v1/venues/images/upload` (each image) → `POST /api/v1/venues` (DRAFT).
3. Success modal → **Add Courts** → `replace('CourtManagement', {venueId})`.
4. **Create court** → `POST /api/v1/venues/{id}/courts`.
   - **If plan cap reached:** server returns `409 COURT_LIMIT_EXCEEDED` → toast "Your <plan> allows <allowed> courts (you have <current>)" with **Upgrade** → `Subscription`.
   - Caps come from plan `maxCourts` (Trial→Pro Max = 2/2/4/6/12).
5. Back in **MyVenues** → **Submit for approval** (status `draft`/`changes_requested`).
   - If `courtCount > 2`: tier-selection modal → choose a plan with `maxCourts ≥ courtCount` → `POST /api/v1/owner/venues/{id}/submit` with `planId`.
   - Else: free submit.

### 7.3 Admin approves a venue → trial handoff
1. Admin **Dashboard** "Pending moderation" → **Venues** (tab `PENDING`) → tap → **Admin VenueDetail**.
2. Action bar built from `detail.availableActions`:
   - **APPROVE** (confirm) → `PATCH /api/v1/venues/{id}/status {status:'LIVE'}`. Venue becomes `LIVE`; owner then starts the trial and selects bookable courts (approval→owner-trial handoff).
   - **SEND_BACK** (reason) → `CHANGES_REQUESTED` → owner sees "Admin requested changes" → edits → resubmits (back to step 1).
   - **REJECT** (reason) → `REJECTED`.
3. Subscription activation (offline/cash) happens in **SubscriptionDetail**: CreateSubscriptionForm (`paymentMethod:'CASH'`, optional "Activate as trial") or Approve a pending change request "(cash received)" → `.../activate` with selected courtIds.
   - *(Expiry notices at 7/3/1 days are server/notification-driven; surfaced via the owner dashboard `subscriptionBadge.remainingDays`.)*

### 7.4 Forgot-password three-step OTP reset
1. **Login** → "Forgot Password?" → **ForgotPassword** (Step `email`).
2. Enter email → **Send Reset Code** → `POST /api/v1/auth/password-reset/request` → 45s cooldown + enumeration-safe toast → Step `otp`.
3. Enter 6-digit code → **Verify Code** → `POST /api/v1/auth/password-reset/verify` → returns `resetToken` → Step `newPassword`. (Code expires in 10 min; Resend honors 45s.)
4. Enter + confirm new password (≥8, ≥1 letter, ≥1 digit; new===confirm) → **Reset Password** → `POST /api/v1/auth/password-reset/confirm` → success toast → navigate **Login** (or `goBack` if launched from Security with `{fromSecurity:true}`).

---

## Appendix — screens found in code beyond the task's original list

| Screen | Route | Status / note |
|---|---|---|
| BookingSuccessScreen | `BookingSuccess` | Legacy single-slot terminal screen |
| PaymentScreen | `Payment` | Legacy single-slot path (simulated payment) |
| BookingConfirmScreen | `BookingConfirm` | Legacy single-slot confirm (unreachable) |
| SearchScreen | `Search` | Orphaned (not registered/called) |
| WalletScreen | `Wallet` | Stub **[Not yet built]** |
| RescheduleScreen | `Reschedule` | Stub **[Not yet built]** |
| HelpSupportScreen | `HelpSupport` | Static FAQ + mailto |
| RoleChangeScreen | `RoleChange` | PLAYER↔OWNER switch |
| OwnerBookingDetailScreen | `OwnerBookingDetail` | Owner booking detail |
| OwnerNotificationsScreen / OwnerSettingsScreen | `OwnerNotifications` / `OwnerSettings` | Owner notif + settings |
| PaymentsRevenueScreen | `PaymentsRevenue` | Payout processing (legacy commission model) |
| NotificationBroadcastScreen | `NotificationBroadcast` | Admin broadcast |
| AnalyticsScreen / CMSScreen | `Analytics` / `CMS` | Placeholders **[Not built]** |
| AdminProfileScreen | `AdminProfile` | Admin profile hub |
| Legacy exports in `AdminScreens.tsx` | — | `VenueApprovalScreen`, `VenueManagementScreen`, `PlayerManagementScreen`, `OwnerManagementScreen`, `DisputeManagementScreen` — **dead/unreachable** (alias routes point to scaled screens) |
| Reused account screens | `AdminEditProfile`, `AdminChangePassword`, `OwnerEditProfile`, etc. | Player screens reused across owner/admin navigators |
