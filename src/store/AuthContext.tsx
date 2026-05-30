import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserRole, User } from '../types';
import { CURRENT_USERS } from '../data/mockData';
import { authService } from '../api/services/authService';
import { saveToken, saveRefreshToken, getToken, clearTokens } from '../api/tokenStorage';
import { userService } from '../api/services/userService';
import { adaptUser } from '../api/adapters';
import { setSessionExpiredCallback } from '../api/client';
import type { RegisterRequest } from '../api/types';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  token: string | null;
  isLoggedIn: boolean;
  isDemoMode: boolean;
  isLoading: boolean;
  authError: string | null;
  /** Demo mode: pick a role without a real backend (SplashScreen) */
  login: (role: UserRole) => void;
  /** Real auth: email + password against /api/v1/auth/login */
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  /** Real auth: register a new user */
  registerUser: (data: Omit<RegisterRequest, 'role'> & { role: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Restore session from secure storage on startup
  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken();
        if (stored) {
          setToken(stored);
          const dto = await userService.getMe();
          setUser(adaptUser(dto));
          setIsDemoMode(false);
        }
      } catch {
        // Token stale — clear silently
        await clearTokens();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Wire the 401-expired callback so the interceptor can trigger logout
  useEffect(() => {
    setSessionExpiredCallback(async () => {
      setUser(null);
      setToken(null);
      setIsDemoMode(false);
    });
  }, []);

  // ── Demo mode (SplashScreen role picker) ────────────────────────────────
  const login = useCallback((role: UserRole) => {
    setUser(CURRENT_USERS[role] as User);
    setToken(null);
    setIsDemoMode(true);
    setAuthError(null);
  }, []);

  // ── Real auth ────────────────────────────────────────────────────────────
  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const res = await authService.login({ email: email.trim().toLowerCase(), password });
      if (!res.token || !res.user) throw new Error('Invalid server response');
      await saveToken(res.token);
      await saveRefreshToken(res.refreshToken ?? res.token);
      setToken(res.token);
      setUser(adaptUser(res.user));
      setIsDemoMode(false);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? e?.message ?? 'Login failed. Please try again.';
      setAuthError(String(msg));
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerUser = useCallback(
    async (data: Omit<RegisterRequest, 'role'> & { role: UserRole }) => {
      setAuthError(null);
      setIsLoading(true);
      try {
        const backendRole = data.role.toUpperCase() as 'PLAYER' | 'OWNER';
        const res = await authService.register({ ...data, role: backendRole });
        if (!res.token || !res.user) throw new Error('Invalid server response');
        await saveToken(res.token);
        await saveRefreshToken(res.refreshToken ?? res.token);
        setToken(res.token);
        setUser(adaptUser(res.user));
        setIsDemoMode(false);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ?? e?.message ?? 'Registration failed. Please try again.';
        setAuthError(String(msg));
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setToken(null);
    setIsDemoMode(false);
    setAuthError(null);
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const role = user?.role ?? null;

  const value: AuthState = {
    user,
    role,
    token,
    isLoggedIn: user !== null,
    isDemoMode,
    isLoading,
    authError,
    login,
    loginWithCredentials,
    registerUser,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
