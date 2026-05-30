# TurfBook — Turf Booking Marketplace (Expo React Native)

A runnable Expo + React Native (TypeScript) demo app for a sports-turf booking
marketplace. Three roles — **Player**, **Venue Owner**, and **Admin** — each with
fully wired screens, navigation, and static/mock data. No backend required.

## Quick start

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npx expo start
```

Then:
- Press **a** to open Android emulator, **i** for iOS simulator, or
- Scan the QR code with the **Expo Go** app on your phone.

> Requires Node 18+. If a native dependency version warning appears, run
> `npx expo install react-native-screens react-native-safe-area-context`
> to align versions with your installed Expo SDK.

## Trying the three roles

The app opens on a **role selection** splash screen (a demo shortcut). Tap:
- **Continue as Player** → booking flows (search, venue, slot, payment, bookings)
- **Continue as Venue Owner** → dashboard, venues, calendar, earnings
- **Continue as Admin** → approvals, disputes, payouts, coupons, analytics

To switch roles, log out from the Profile tab (Player/Owner) or
Dashboard → Settings → Logout (Admin). "Go to Login Screen" shows the auth flow
(login / register / OTP); logging in there enters the Player app.

## Project structure

```
App.tsx                     # providers + NavigationContainer + RootNavigator
src/
  theme/        index.ts     # colors, spacing, radius, typography tokens
  types/        index.ts     # shared TypeScript interfaces
  data/         mockData.ts  # all static data (venues, slots, bookings, …)
  store/        AuthContext  # role-based auth context (login/logout)
  components/
    common/     index.tsx    # AppButton, AppInput, AppHeader, StatusBadge, …
    venue/      index.tsx    # VenueCard, SlotGrid, BookingCard, PriceSummary
  modals/       index.tsx    # confirm / cancel / coupon / payment modals
  screens/
    auth/                    # Splash, Login, Register, OTP, ForgotPassword
    player/                  # Home, Search, VenueDetail, SlotSelection, …
    owner/                   # Dashboard, MyVenues, AddVenue, Calendar, …
    admin/                   # Dashboard, Approvals, Disputes, Payments, …
  navigation/
    RootNavigator.tsx        # switches navigator based on logged-in role
    AuthNavigator.tsx        # auth stack
    PlayerTabNavigator.tsx   # player bottom tabs + per-tab stacks
    OwnerTabNavigator.tsx    # owner bottom tabs + per-tab stacks
    AdminNavigator.tsx       # admin stack (dashboard hub + modules)
```

## How routing works

`RootNavigator` reads the current role from `AuthContext` and renders the matching
navigator. Player and Owner use bottom-tab navigators where each tab is its own
stack; screens reached from multiple tabs (venue detail, booking flow, etc.) are
registered in every tab stack so any `navigation.navigate('X')` resolves no matter
which tab is active. Cross-tab jumps (e.g. "View My Bookings" after a successful
booking) bubble up to the tab navigator and switch tabs.

## Swapping mock data for a real API

All static data lives in `src/data/mockData.ts`. Replace the exported constants
with API calls (or wire React Query/SWR) and keep the same shapes defined in
`src/types/index.ts` — the screens consume those types directly.
