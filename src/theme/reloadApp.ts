import { Platform } from 'react-native';

/**
 * Reload the JS app so static styles re-evaluate with the newly chosen theme palette.
 * Web → location.reload; native → expo-updates reloadAsync (works in Expo Go + builds),
 * falling back to the dev reload if updates is unavailable.
 */
export async function reloadApp(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }
  try {
    // require (not import) so the bundler resolves it without dynamic-import tsconfig constraints.
    const Updates = require('expo-updates');
    await Updates.reloadAsync();
  } catch {
    try {
      const { DevSettings } = require('react-native');
      DevSettings.reload();
    } catch {
      // No reload mechanism available — the new theme will apply on the next manual launch.
    }
  }
}
