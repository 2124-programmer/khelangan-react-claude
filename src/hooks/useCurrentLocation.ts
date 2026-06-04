import { useState, useEffect } from 'react';
import * as Location from "expo-location"; // Wrapped to handle web fallback

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Requests foreground location permission once, then resolves the device's
 * current GPS position.  Returns null until the position is known or if the
 * user denies permission.
 *
 * Requires: expo install expo-location
 */
export function useCurrentLocation(): LatLng | null {
  const [location, setLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!cancelled) {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        // Permission denied or location unavailable — stay null
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return location;
}
