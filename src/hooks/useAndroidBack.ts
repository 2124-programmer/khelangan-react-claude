import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Run a custom Android hardware-back handler while the screen is focused.
 * Return `true` from `handler` to consume the press (e.g. step back within a
 * multi-step flow); return `false` to let the default navigation back proceed.
 * No-op on iOS (BackHandler events only fire on Android).
 */
export function useAndroidBack(handler: () => boolean) {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', handler);
      return () => sub.remove();
    }, [handler]),
  );
}
