# TurfBook — Frontend ↔ Backend Integration Guide

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the backend
```bash
cd turfbook-backend
mvn spring-boot:run
# Swagger UI: http://localhost:8080/swagger-ui.html
# OpenAPI spec: http://localhost:8080/v3/api-docs
```

### 3. Point the app at the backend

Edit `src/api/client.ts` — change `BASE_URL`:

| Scenario | BASE_URL |
|---|---|
| Android emulator | `http://10.0.2.2:8080` (default) |
| iOS simulator | `http://localhost:8080` |
| Physical device | `http://<your-LAN-IP>:8080` |
| Staging / Prod | `https://api.yourdomain.com` |

### 4. Start the app
```bash
npm run android   # Android emulator
npm run ios       # iOS simulator
npm start         # Expo Go (scan QR)
```

---

## Architecture

```
src/
  api/
    types.ts          ← Backend DTO types (mirrors OpenAPI schemas)
    client.ts         ← Axios instance — baseURL, auth header, 401 refresh
    tokenStorage.ts   ← JWT stored in expo-secure-store
    queryClient.ts    ← TanStack Query v5 client
    adapters.ts       ← Backend DTO → Frontend type converters
    services/         ← One file per resource (raw API calls)
    hooks/            ← TanStack Query hooks consumed by screens
  store/
    AuthContext.tsx   ← JWT auth state + demo mode
  hooks/
    useDebounce.ts    ← Search debounce helper
```

### Auth flow
- `loginWithCredentials(email, password)` → POST `/api/v1/auth/login` → stores JWT in SecureStore
- JWT automatically attached to every request via Axios request interceptor
- 401 response → refresh token flow → retry original request
- Session restored from SecureStore on app restart

### Demo mode (SplashScreen)
The SplashScreen role-picker (`login('player')` / `login('owner')` / `login('admin')`) still works for UI exploration without a running backend. When using demo mode, API hooks receive no token and unauthenticated requests will fail — use real login for full API integration.

---

## Regenerate types from OpenAPI

Run this after the backend OpenAPI spec (`api.yaml`) changes:

```bash
npm run generate-api
```

This runs `openapi-generator-cli` with `typescript-axios` and writes to `src/api/generated/`.

The generated client is a cross-reference source. The hand-maintained `src/api/types.ts` is the current source of truth (no generated output is imported yet).

---

## Key files changed in this integration

| File | What changed |
|---|---|
| `App.tsx` | Added `QueryClientProvider` |
| `src/store/AuthContext.tsx` | Real JWT auth + `loginWithCredentials` / `registerUser` |
| `src/api/client.ts` | Axios instance with request + response interceptors |
| `src/api/tokenStorage.ts` | `expo-secure-store` wrapper |
| `src/api/adapters.ts` | int64 ID → string, uppercase enum → lowercase |
| `src/screens/auth/LoginScreen.tsx` | Calls `loginWithCredentials`, shows field errors |
| `src/screens/auth/RegisterScreen.tsx` | Calls `registerUser`, shows field errors |
| `src/screens/player/PlayerHomeScreen.tsx` | `useSports` + `useVenues` |
| `src/screens/player/VenueDetailScreen.tsx` | `useVenueDetail` + `useVenueReviews` |
| `src/screens/player/SlotSelectionScreen.tsx` | `useVenueDetail` + `useSlots` (live dates) |
| `src/screens/player/BookingConfirmScreen.tsx` | `useCoupons` + `useValidateCoupon` + real coupon math |
| `src/screens/player/PaymentScreen.tsx` | `useCreateBooking` (booking created at payment time) |
| `src/screens/player/MyBookingsScreen.tsx` | `useBookings` + `useCancelBooking` |
| `src/screens/player/BookingDetailScreen.tsx` | `useBookingDetail` + `useCancelBooking` |
| `src/screens/player/RateReviewScreen.tsx` | `useCreateReview` |
| `src/screens/player/NotificationsScreen.tsx` | `useNotifications` + mark-read |
| `src/screens/player/SearchScreen.tsx` | `useVenues` with live search + sport filter |
| `src/screens/player/MiscScreens.tsx` | OffersScreen→`useCoupons`, EditProfile→`useUpdateProfile`, Dispute→`useCreateDispute` |
| `src/screens/owner/OwnerDashboardScreen.tsx` | `useOwnerStats` + `useBookings` |
| `src/screens/owner/MyVenuesScreen.tsx` | `useOwnerVenues` |
| `src/screens/owner/AddVenueScreen.tsx` | `useSports` + `useCreateVenue` |
| `src/screens/owner/OwnerScreens.tsx` | All owner sub-screens wired to real API |
| `src/screens/admin/AdminDashboardScreen.tsx` | `useAdminStats` |
| `src/screens/admin/AdminScreens.tsx` | All admin sub-screens wired (approvals, users, payouts, disputes, coupons, broadcast, settings) |

---

## Backend adapter notes

| Backend field | Frontend field | Adapter logic |
|---|---|---|
| `id: number (int64)` | `id: string` | `String(dto.id)` |
| `role: "PLAYER"` | `role: "player"` | `.toLowerCase()` |
| `status: "LIVE"` | `status: "live"` | `.toLowerCase()` |
| `avatarUrl` | `avatar` | renamed |
| `VenueSummaryDto` (no sports/amenities) | `Venue.sports: []` | filled as empty; VenueDetail has full data |
| `BookingDto.amount + convenienceFee - discount` | `Booking.amount` | summed in adapter |
| `ReviewDto.createdAt` | `Review.date` | `.split('T')[0]` |
