import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearTokens } from './tokenStorage';
import { logger, setCorrelationId } from '../utils/logger';

/**
 * BASE URL — resolved by platform at runtime:
 *   android  → 10.0.2.2  (emulator loopback to host machine)
 *   ios/web  → localhost  (simulator / browser both reach host directly)
 *   physical device (any platform) → set EXPO_PUBLIC_API_URL env var
 *                                    or change DEVICE_LAN_IP below
 */
const DEVICE_LAN_IP = '192.168.1.100'; // ← change only if testing on a real device

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8080';
  return 'http://localhost:8080';
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

// ─── Request interceptor — attach JWT + correlation id ───────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Generate a fresh correlation ID for each request and attach it to the header
  // so backend logs can be joined to frontend logs by this single ID.
  const cid = generateCorrelationId();
  config.headers['X-Correlation-Id'] = cid;
  setCorrelationId(cid);

  // Store start time for duration calculation in response interceptor
  (config as InternalAxiosRequestConfig & { _startMs?: number })._startMs = Date.now();

  logger.info('API_REQUEST', {
    method: config.method?.toUpperCase(),
    url: config.url,
    cid,
    // Never log Authorization header or request body
  });

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
    const durationMs = cfg._startMs ? Date.now() - cfg._startMs : undefined;
    const cid = cfg.headers?.['X-Correlation-Id'] as string | undefined;

    logger.info('API_RESPONSE', {
      method: cfg.method?.toUpperCase(),
      url: cfg.url,
      status: response.status,
      durationMs,
      cid,
    });

    return response;
  },
  async (error: AxiosError) => {
    const cfg = error.config as (InternalAxiosRequestConfig & { _startMs?: number; _retry?: boolean }) | undefined;
    const durationMs = cfg?._startMs ? Date.now() - cfg._startMs : undefined;
    const cid = cfg?.headers?.['X-Correlation-Id'] as string | undefined;

    logger.warn('API_ERROR', {
      method: cfg?.method?.toUpperCase(),
      url: cfg?.url,
      status: error.response?.status,
      code: error.code,
      durationMs,
      cid,
      // Never log response body — may contain PII
    });

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
        logger.info('SESSION_REFRESHED');
        return apiClient(original);
      } catch (e) {
        processQueue(e, null);
        await clearTokens();
        logger.warn('SESSION_EXPIRED');
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
