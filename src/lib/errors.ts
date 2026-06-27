/**
 * Error classification for the data layer.
 *
 * A backend being down is a DATA-layer problem, not a navigation problem. This module turns any
 * thrown value (almost always an AxiosError, since the app uses the axios client in src/api/client.ts)
 * into one of a small, exhaustive set of `AppError` kinds so the UI can react consistently:
 *   - inline <ErrorState> for screen/section data (see src/components/QueryState.tsx)
 *   - the only kind that may drive routing is 'auth' (a genuine 401/403).
 *
 * To tell 'offline' (the device has no connection) apart from 'unreachable' (device is online but
 * the server didn't answer) we keep a synchronous snapshot of NetInfo's connectivity, updated by a
 * listener. classifyError() is synchronous, so it reads that cached value rather than awaiting.
 */
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

export type AppError =
  | 'offline' // device has no network connection
  | 'unreachable' // device online, but the backend did not respond (no HTTP status)
  | 'server' // backend responded with 5xx
  | 'auth' // backend responded with 401/403 — the ONLY kind that may drive routing
  | 'notFound' // backend responded with 404
  | 'unknown'; // any other HTTP response or unrecognised failure

// ─── Connectivity snapshot ──────────────────────────────────────────────────
// `null` = unknown (NetInfo hasn't reported yet). We only treat an explicit `false` as "offline";
// when connectivity is unknown we fall back to 'unreachable' so we never wrongly blame the user.
let deviceConnected: boolean | null = null;

try {
  // On web, NetInfo's default reachability probe fires `HEAD /` on a timer and aborts the in-flight
  // probe each cycle — surfacing as red "(canceled)" requests in the network panel. That probe only
  // feeds `isInternetReachable`, which we never read: both consumers (classifyError below and the
  // QueryClient's onlineManager) use `isConnected`, sourced from the browser's online/offline events
  // independently of the probe. So we turn the probe off to keep the network panel clean. The
  // "device online but server didn't answer" case is still detected — that's a failed API call,
  // classified as 'unreachable', not something the probe is responsible for.
  NetInfo.configure({ reachabilityShouldRun: () => false });

  NetInfo.addEventListener((state) => {
    deviceConnected = state.isConnected;
  });
} catch {
  // NetInfo unavailable (e.g. during unit tests / SSR) — leave connectivity unknown.
}

/** Latest known device connectivity, or `null` if NetInfo has not reported yet. */
export function isDeviceConnected(): boolean | null {
  return deviceConnected;
}

// ─── Classifier ─────────────────────────────────────────────────────────────

/** Returns true for the axios "request made but no response received" network failures. */
function isNetworkFailure(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return true;
    }
    if (!err.response && /network|timeout/i.test(err.message ?? '')) return true;
  }
  // Non-axios fallbacks (e.g. a raw fetch TypeError or a thrown Error from a service layer).
  if (err instanceof Error && /network/i.test(err.message)) return true;
  return false;
}

export function classifyError(err: unknown): AppError {
  // 1. A real HTTP response wins — the server spoke, so connectivity is irrelevant.
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (status != null) {
    if (status === 401 || status === 403) return 'auth';
    if (status === 404) return 'notFound';
    if (status >= 500) return 'server';
    return 'unknown';
  }

  // 2. No response object → network-level failure. Use NetInfo to split offline vs unreachable.
  if (isNetworkFailure(err)) {
    return deviceConnected === false ? 'offline' : 'unreachable';
  }

  return 'unknown';
}
