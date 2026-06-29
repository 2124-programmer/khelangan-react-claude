/// <reference types="node" />
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearTokens } from './tokenStorage';

// Priority 1: EXPO_PUBLIC_API_URL in .env  (preferred — update .env when IP changes)
// Priority 2: DEVICE_LAN_IP below         (fallback — run `ipconfig` to get current IP)
const DEVICE_LAN_IP = '192.168.1.50';

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return `http://${DEVICE_LAN_IP}:8080`;
}

export const BASE_URL = resolveBaseUrl();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Correlation ID generator ─────────────────────────────────────────────────

function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Request interceptor — attach JWT + log ──────────────────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const cid = generateCorrelationId();
  config.headers['X-Correlation-Id'] = cid;
  (config as InternalAxiosRequestConfig & { _startMs?: number })._startMs = Date.now();

  // Never log Authorization header or request body. Dev-only — stripped from release builds.
  if (__DEV__) {
    console.log('[API REQUEST]', config.method?.toUpperCase(), config.url, '| cid:', cid);
  }

  return config;
});

// ─── Response interceptor — refresh on 401 ───────────────────────────────────

let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];
let onSessionExpiredCb: (() => void) | null = null;
let onPasswordChangeRequiredCb: (() => void) | null = null;

export function setSessionExpiredCallback(cb: () => void) {
  onSessionExpiredCb = cb;
}

/**
 * Wire a handler for the server's forced-password-change gate. When ANY authorized call returns
 * 403 PASSWORD_CHANGE_REQUIRED, AuthContext flips the app into forced-change mode (rather than
 * logging out or crashing). See JwtAuthenticationFilter on the backend.
 */
export function setPasswordChangeRequiredCallback(cb: () => void) {
  onPasswordChangeRequiredCb = cb;
}

/** True when an error is the backend's 403 PASSWORD_CHANGE_REQUIRED gate. */
export function isPasswordChangeRequired(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response?.status === 403
      && (error.response?.data as { error?: string } | undefined)?.error === 'PASSWORD_CHANGE_REQUIRED';
  }
  return false;
}

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    const cfg = response.config as InternalAxiosRequestConfig & { _startMs?: number };
    const durationMs = cfg._startMs ? Date.now() - cfg._startMs : '-';
    const cid = cfg.headers?.['X-Correlation-Id'];
    if (__DEV__) {
      console.log('[API RESPONSE]', response.status, cfg.method?.toUpperCase(), cfg.url,
        `| ${durationMs}ms | cid:`, cid);
    }
    return response;
  },
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _startMs?: number; _retry?: boolean }) | undefined;
    const durationMs = cfg?._startMs ? Date.now() - cfg._startMs : '-';
    const cid = cfg?.headers?.['X-Correlation-Id'];
    // Log error status + message; never log request body (may contain passwords/PII).
    // Dev-only — stripped from release builds.
    if (__DEV__) {
      console.error('[API ERROR]', error.response?.status ?? error.code,
        cfg?.method?.toUpperCase(), cfg?.url,
        '|', error.response?.data ?? error.message,
        `| ${durationMs}ms | cid:`, cid);
    }

    const original = cfg;
    // Auth endpoints (login, register, otp, password-reset, change-password, refresh) own their
    // 401s — a 401 here means "bad credentials / invalid code", NOT an expired session. Never try
    // to refresh or fire the session-expired flow for these; let the original error reach the caller.
    const isAuthEndpoint = (original?.url ?? '').includes('/api/v1/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const newToken: string = res.data.token;
        const newRefresh: string = res.data.refreshToken ?? newToken;
        await saveToken(newToken);
        await saveRefreshToken(newRefresh);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        if (__DEV__) console.log('[SESSION] Token refreshed successfully');
        return apiClient(original);
      } catch (e) {
        processQueue(e, null);
        await clearTokens();
        if (__DEV__) console.warn('[SESSION] Session expired — tokens cleared');
        onSessionExpiredCb?.();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    // Forced-password-change gate: the server blocks every endpoint (except change-password) with
    // 403 PASSWORD_CHANGE_REQUIRED until the user changes their password. Flip the app into
    // forced-change mode rather than letting callers treat it as a generic error / logout.
    if (isPasswordChangeRequired(error)) {
      onPasswordChangeRequiredCb?.();
    }

    return Promise.reject(error);
  }
);

// ─── Error helpers ────────────────────────────────────────────────────────────

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) return String(data.message);
    if (data?.error) return String(data.error);
    if (error.message) {
      // Include error.code so network-level failures show a diagnostic tag,
      // e.g. "Network Error [ERR_NETWORK]" or "Network Error [ERR_CLEARTEXT_NOT_PERMITTED]".
      return error.code ? `${error.message} [${error.code}]` : error.message;
    }
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Reads the structured court-limit details from a 409 COURT_LIMIT_EXCEEDED error, if present.
 * Returns null for any other error, so callers can branch on "is this a court-limit block?".
 */
export function extractCourtLimit(
  error: unknown,
): { allowed: number; current: number; planName?: string } | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.error === 'COURT_LIMIT_EXCEEDED' && data?.details) {
      return {
        allowed: Number(data.details.allowed ?? 0),
        current: Number(data.details.current ?? 0),
        planName: data.details.planName ? String(data.details.planName) : undefined,
      };
    }
  }
  return null;
}

export function extractFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    const fieldErrors: { field: string; message: string }[] | undefined =
      error.response?.data?.fieldErrors;
    if (fieldErrors) {
      return Object.fromEntries(fieldErrors.map(({ field, message }) => [field, message]));
    }
  }
  return {};
}

export function getHttpStatus(error: unknown): number | null {
  if (axios.isAxiosError(error)) return error.response?.status ?? null;
  return null;
}
