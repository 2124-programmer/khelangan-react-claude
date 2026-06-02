import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationState } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import GuestNavigator from './GuestNavigator';
import PlayerTabNavigator from './PlayerTabNavigator';
import OwnerTabNavigator from './OwnerTabNavigator';
import AdminNavigator from './AdminNavigator';
import { colors } from '../theme';

/** Walks nested nav state to find the deepest active route name. */
export function getActiveRouteName(state: NavigationState | undefined): string {
  if (!state) return 'Unknown';
  const route = state.routes[state.index];
  if (route.state) return getActiveRouteName(route.state as NavigationState);
  return route.name;
}

export default function RootNavigator() {
  const { role, isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isLoggedIn || !role) return <GuestNavigator />;
  if (role === 'owner') return <OwnerTabNavigator />;
  if (role === 'admin') return <AdminNavigator />;
  return <PlayerTabNavigator />;
}
