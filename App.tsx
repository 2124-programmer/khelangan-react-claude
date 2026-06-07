import React, { useEffect } from 'react';
import { StatusBar, AppState } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/store/AuthContext';
import { LocationProvider } from './src/store/LocationContext';
import { queryClient } from './src/api/queryClient';
import { sportService } from './src/api/services/sportService';
import { adaptSport } from './src/api/adapters';
import { setSportsRegistry } from './src/utils/sportUtils';
import RootNavigator from './src/navigation/RootNavigator';

function SportsBootstrap() {
  useEffect(() => {
    sportService.list()
      .then((dtos) => setSportsRegistry(dtos.map(adaptSport)))
      .catch(() => {}); // silently ignore — demo mode has no backend
  }, []);
  return null;
}

function AppStateBridge() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => sub.remove();
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocationProvider>
            <SportsBootstrap />
            <AppStateBridge />
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
              <RootNavigator />
            </NavigationContainer>
          </LocationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
