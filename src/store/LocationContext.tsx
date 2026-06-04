import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LatLng {
  lat: number;
  lng: number;
}

type PermissionStatus = 'unknown' | 'granted' | 'denied';

interface LocationState {
  location: LatLng | null;
  permission: PermissionStatus;
  isResolving: boolean;
}

const LocationContext = createContext<LocationState>({
  location: null,
  permission: 'unknown',
  isResolving: true,
});

const TIMEOUT_MS = 10_000;
const TAG = '[Location]';

// ─── Web path: browser navigator.geolocation ─────────────────────────────────

function resolveWebLocation(
  onSuccess: (pos: LatLng) => void,
  onDone: (status: PermissionStatus) => void,
) {
  console.log(TAG, 'platform=web, checking navigator.geolocation...');

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    console.warn(TAG, 'navigator.geolocation not available');
    onDone('denied');
    return;
  }

  // Check if the page is on a secure context — Chrome blocks geolocation on HTTP+LAN-IP
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    console.warn(
      TAG,
      'Page is NOT a secure context (HTTP + non-localhost). Chrome blocks geolocation.',
      'Open the app at http://localhost:<port> instead of the LAN IP.',
    );
  }

  console.log(TAG, 'calling getCurrentPosition...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const loc: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      console.log(TAG, 'position resolved:', loc);
      onSuccess(loc);
      onDone('granted');
    },
    (err) => {
      // err.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
      console.warn(TAG, 'geolocation error, code:', err.code, err.message);
      onDone('denied');
    },
    { timeout: TIMEOUT_MS, enableHighAccuracy: false, maximumAge: 60_000 },
  );
}

// ─── Native path: expo-location ──────────────────────────────────────────────

async function resolveNativeLocation(
  onLocation: (pos: LatLng) => void,
  onPermission: (status: PermissionStatus) => void,
  onDone: () => void,
  isMounted: () => boolean,
) {
  try {
    console.log(TAG, 'platform=native, requesting permission...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log(TAG, 'permission status:', status);
    if (!isMounted()) return;

    if (status !== 'granted') {
      onPermission('denied');
      onDone();
      return;
    }
    onPermission('granted');

    // Fast path
    try {
      const last = await Location.getLastKnownPositionAsync({});
      if (last && isMounted()) {
        const loc = { lat: last.coords.latitude, lng: last.coords.longitude };
        console.log(TAG, 'last known position:', loc);
        onLocation(loc);
        onDone();
      }
    } catch {
      // Not available on this platform
    }

    // Accurate fix
    const pos = await Promise.race<Location.LocationObject | null>([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((res) => setTimeout(() => res(null), TIMEOUT_MS)),
    ]);

    if (pos && isMounted()) {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      console.log(TAG, 'accurate position:', loc);
      onLocation(loc);
    }
  } catch (e) {
    console.error(TAG, 'native location error:', e);
    if (isMounted()) onPermission('denied');
  } finally {
    if (isMounted()) onDone();
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('unknown');
  const [isResolving, setIsResolving] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    console.log(TAG, 'Provider mounted, Platform.OS =', Platform.OS);

    if (Platform.OS === 'web') {
      resolveWebLocation(
        (pos) => { if (mounted.current) setLocation(pos); },
        (status) => {
          if (mounted.current) {
            setPermission(status);
            setIsResolving(false);
          }
        },
      );
    } else {
      resolveNativeLocation(
        (pos) => { if (mounted.current) setLocation(pos); },
        (status) => { if (mounted.current) setPermission(status); },
        () => { if (mounted.current) setIsResolving(false); },
        () => mounted.current,
      );
    }

    return () => { mounted.current = false; };
  }, []);

  return (
    <LocationContext.Provider value={{ location, permission, isResolving }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  return useContext(LocationContext);
}
