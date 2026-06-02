import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../store/AuthContext';
import GuestNavigator from './GuestNavigator';
import PlayerTabNavigator from './PlayerTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminNavigator from './AdminNavigator';
import { colors } from '../theme';

export default function RootNavigator() {
  const { role, isLoggedIn, isLoading } = useAuth();

  // Hold behind a splash gate while restoring session from secure storage.
  // This prevents flashing the wrong screen (guest vs. role home) on cold start.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not logged in (or demo mode cleared) → guest Home
  // Logout routes here automatically; the user lands on the venue feed, not the login screen.
  if (!isLoggedIn || !role) return <GuestNavigator />;

  if (role === 'owner') return <OwnerTabNavigator />;
  if (role === 'admin') return <AdminNavigator />;
  return <PlayerTabNavigator />;
}
