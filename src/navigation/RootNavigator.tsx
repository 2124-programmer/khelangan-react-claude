import React from 'react';
import { useAuth } from '../store/AuthContext';
import AuthNavigator from './AuthNavigator';
import PlayerTabNavigator from './PlayerTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminNavigator from './AdminNavigator';

export default function RootNavigator() {
  const { role, isLoggedIn } = useAuth();

  if (!isLoggedIn || !role) return <AuthNavigator />;
  if (role === 'owner') return <OwnerTabNavigator />;
  if (role === 'admin') return <AdminNavigator />;
  return <PlayerTabNavigator />;
}
