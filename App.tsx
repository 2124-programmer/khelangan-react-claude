import React, { useEffect, useRef } from 'react';
import { StatusBar, AppState, Linking } from 'react-native';
import { useFonts } from 'expo-font';
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
import { colors, isDark } from './src/theme';
import { applyInterFont } from './src/theme/applyFonts';

// Patch Text/TextInput once so every label across the app renders in Inter at the right weight.
applyInterFont();

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

  // Load Inter's weight files directly (the family keys match the names used by applyInterFont).
  // Load Inter from the project's own assets/fonts (NOT node_modules): assets under the project
  // root are embedded in the standalone binary via `assetBundlePatterns`, whereas fonts required
  // from node_modules aren't reliably bundled — that failure is what left release APKs rendering
  // in the device's fallback font. The family keys still match the names used by applyInterFont.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require('./assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('./assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('./assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('./assets/fonts/Inter_700Bold.ttf'),
  });

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

  // Hold the (native splash) until Inter is ready so the first paint isn't a system-font flash.
  // But NEVER block forever: if font loading errors in a standalone build, render anyway (falling
  // back to the system font) instead of leaving a permanent blank/white screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocationProvider>
            <AppStateBridge />
            <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
              <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.surface}
                translucent={false}
              />
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
