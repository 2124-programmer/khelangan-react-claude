import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { pushService } from '../api/services/pushService';

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Cache the last token so we don't re-register the same value every time.
let lastToken: string | null = null;

function resolveProjectId(): string | undefined {
  // expo-constants surfaces the EAS projectId from app.json `extra.eas.projectId`.
  const fromExpoConfig = (Constants?.expoConfig as any)?.extra?.eas?.projectId;
  const fromEasConfig = (Constants as any)?.easConfig?.projectId;
  return fromExpoConfig ?? fromEasConfig;
}

/**
 * Request notification permission, obtain the Expo push token, and register it with the backend.
 * Best-effort: any failure is swallowed so it can never block sign-in or app startup. A no-op on
 * simulators/emulators (which can't receive push) and when permission is denied.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = resolveProjectId();
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResp.data;
    if (!token || token === lastToken) return;

    await pushService.register({ token, platform: Platform.OS });
    lastToken = token;
  } catch {
    // Best-effort: never let push registration break the app.
  }
}

/** Remove the current device token from the backend (called on logout). */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    if (lastToken) {
      await pushService.unregister(lastToken);
      lastToken = null;
    }
  } catch {
    // Best-effort.
  }
}
