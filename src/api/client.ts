/// <reference types="node" />
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearTokens } from './tokenStorage';

/**
 * BASE URL — resolved by platform at runtime:
 *   android  → 10.0.2.2  (emulator loopback to host machine)
 *   ios/web  → localhost  (simulator / browser both reach host directly)
 *   physical device (any platform) → set EXPO_PUBLIC_API_URL env var
 *                                    or change DEVICE_LAN_IP below
 */
const DEVICE_LAN_IP = '192.168.1.4'; // PC's LAN IP — update if it changes

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

  // Never log Authorization header or request body
  console.log('[API REQUEST]', config.method?.toUpperCase(), config.url, '| cid:', cid);

  return config;
});

// ─── Response interceptor — refresh on 401 ───────────────────────────────────

let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];
let onSessionExpiredCb: (() => void) | null = null;

export function setSessionExpiredCallback(cb: () => void) {
  onSessionExpiredCb = cb;
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
    console.log('[API RESPONSE]', response.status, cfg.method?.toUpperCase(), cfg.url,
      `| ${durationMs}ms | cid:`, cid);
    return response;
  },
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _startMs?: number; _retry?: boolean }) | undefined;
    const durationMs = cfg?._startMs ? Date.now() - cfg._startMs : '-';
    const cid = cfg?.headers?.['X-Correlation-Id'];
    // Log error status + message; never log request body (may contain passwords/PII)
    console.error('[API ERROR]', error.response?.status ?? error.code,
      cfg?.method?.toUpperCase(), cfg?.url,
      '|', error.response?.data ?? error.message,
      `| ${durationMs}ms | cid:`, cid);

    const original = cfg;
    if (error.response?.status === 401 && original && !original._retry) {
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
        console.log('[SESSION] Token refreshed successfully');
        return apiClient(original);
      } catch (e) {
        processQueue(e, null);
        await clearTokens();
        console.warn('[SESSION] Session expired — tokens cleared');
        onSessionExpiredCb?.();
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
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
    if (error.message) return error.message;
  }
  return 'Something went wrong. Please try again.';
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
