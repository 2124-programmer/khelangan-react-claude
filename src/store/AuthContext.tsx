// Lightweight auth/role store using React Context.
// Drives which navigator (Player/Owner/Admin) is shown.
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, User } from '../types';
import { CURRENT_USERS } from '../data/mockData';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoggedIn: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>('player');

  const login = (selectedRole: UserRole) => setRole(selectedRole);
  const logout = () => setRole(null);

  const value: AuthState = {
    role,
    user: role ? CURRENT_USERS[role] : null,
    isLoggedIn: role !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
