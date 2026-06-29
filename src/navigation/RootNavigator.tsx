import React, { useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { useSplashGate } from '../utils/splashGate';
import { registerForPushNotifications } from '../push/registerPush';
import AuthNavigator from './AuthNavigator';
import GuestNavigator from './GuestNavigator';
import PlayerTabNavigator from './PlayerTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminNavigator from './AdminNavigator';
import ForcedChangePasswordScreen from '../screens/auth/ForcedChangePasswordScreen';

export default function RootNavigator() {
  const { role, isLoggedIn, isLoading, mustChangePassword } = useAuth();
  const splashDone = useSplashGate();

  // Register this device for push once authenticated (best-effort, never blocks rendering).
  useEffect(() => {
    if (isLoggedIn) registerForPushNotifications();
  }, [isLoggedIn]);

  // Hold on splash until both token-restore and animation are done
  if (isLoading || !splashDone) return <AuthNavigator />;

  // Forced first-login password change: the server blocks every other endpoint until it's done,
  // so gate the whole app here regardless of role (or whether getMe could even load the profile).
  if (mustChangePassword) return <ForcedChangePasswordScreen />;

  if (!isLoggedIn) return <GuestNavigator />;      // → venues + Sign In tab
  if (role === 'owner') return <OwnerTabNavigator />;
  if (role === 'admin') return <AdminNavigator />;
  return <PlayerTabNavigator />;
}
