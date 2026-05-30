import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearTokens } from './tokenStorage';

/**
 * BASE URL — change per environment:
 *   Android emulator  → http://10.0.2.2:8080
 *   iOS simulator     → http://localhost:8080
 *   Physical device   → http://<your-LAN-IP>:8080
 *   Staging/Prod      → https://api.yourdomain.com
 */
export const BASE_URL = 'http://10.0.2.2:8080';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
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
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
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
        return apiClient(original);
      } catch (e) {
        processQueue(e, null);
        await clearTokens();
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
