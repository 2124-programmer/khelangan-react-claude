import React from 'react';
import { useAuth } from '../store/AuthContext';
import { useSplashGate } from '../utils/splashGate';
import AuthNavigator from './AuthNavigator';
import GuestNavigator from './GuestNavigator';
import PlayerTabNavigator from './PlayerTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminNavigator from './AdminNavigator';

export default function RootNavigator() {
  const { role, isLoggedIn, isLoading } = useAuth();
  const splashDone = useSplashGate();

  // Hold on splash until both token-restore and animation are done
  if (isLoading || !splashDone) return <AuthNavigator />;

  if (!isLoggedIn) return <GuestNavigator />;      // → venues + Sign In tab
  if (role === 'owner') return <OwnerTabNavigator />;
  if (role === 'admin') return <AdminNavigator />;
  return <PlayerTabNavigator />;
}
