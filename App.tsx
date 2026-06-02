import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/store/AuthContext';
import { queryClient } from './src/api/queryClient';
import { sportService } from './src/api/services/sportService';
import { adaptSport } from './src/api/adapters';
import { setSportsRegistry } from './src/utils/sportUtils';
import { logger, setCurrentScreen } from './src/utils/logger';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import RootNavigator, { getActiveRouteName } from './src/navigation/RootNavigator';

function SportsBootstrap() {
  useEffect(() => {
    sportService.list()
      .then((dtos) => setSportsRegistry(dtos.map(adaptSport)))
      .catch(() => {}); // silently ignore — demo mode has no backend
  }, []);
  return null;
}

// ─── Global unhandled-rejection handler ──────────────────────────────────────

function useUnhandledRejectionLogger() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      logger.error('UNHANDLED_REJECTION', {
        reason: event.reason instanceof Error ? event.reason.name : String(event.reason),
      }, event.reason instanceof Error ? event.reason : undefined);
    };
    if (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis) {
      (globalThis as unknown as EventTarget).addEventListener('unhandledrejection', handler as EventListener);
      return () => {
        (globalThis as unknown as EventTarget).removeEventListener('unhandledrejection', handler as EventListener);
      };
    }
  }, []);
}

export default function App() {
  useUnhandledRejectionLogger();
  const prevScreenRef = useRef<string | null>(null);

  const onNavigationStateChange = (state: NavigationState | undefined) => {
    const current = getActiveRouteName(state);
    const previous = prevScreenRef.current;
    if (current !== previous) {
      setCurrentScreen(current);
      logger.info('SCREEN_VIEW', { screen: current, from: previous ?? 'app_start' });
      prevScreenRef.current = current;
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <AuthProvider>
            <SportsBootstrap />
            <NavigationContainer onStateChange={onNavigationStateChange}>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
