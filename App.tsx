import React, { useEffect, useRef } from 'react';
import { StatusBar, AppState, Linking } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './src/store/AuthContext';
import { LocationProvider } from './src/store/LocationContext';
import { queryClient } from './src/api/queryClient';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastHost } from './src/toast';
import { BootstrapGate } from './src/components/BootstrapGate';

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
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  // Holds a venueId from a cold-start deep link until the navigator is ready
  const pendingVenueId = useRef<string | null>(null);

  const navigateToVenue = (venueId: string) => {
    (navigationRef.current as any)?.navigate('VenueDetail', { venueId });
  };

  const handleDeepLink = (url: string | null) => {
    if (!url) return;
    const match = url.match(/scoreadda:\/\/venue\/([^/?]+)/);
    if (!match) return;
    const venueId = match[1];
    if (navigationRef.current?.isReady()) {
      navigateToVenue(venueId);
    } else {
      // Navigator not ready yet (cold start) — defer until onReady fires
      pendingVenueId.current = venueId;
    }
  };

  useEffect(() => {
    // Cold start: app opened from dead state via deep link
    Linking.getInitialURL().then((url) => handleDeepLink(url));
    // Foreground: app already open when link is tapped
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onNavigationReady = () => {
    if (pendingVenueId.current) {
      navigateToVenue(pendingVenueId.current);
      pendingVenueId.current = null;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocationProvider>
            <AppStateBridge />
            <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
              <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
              <RootNavigator />
            </NavigationContainer>
            {/* Full-screen retry overlay when cold-start session restore fails for a non-auth reason. */}
            <BootstrapGate />
          </LocationProvider>
        </AuthProvider>
        <ToastHost />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
