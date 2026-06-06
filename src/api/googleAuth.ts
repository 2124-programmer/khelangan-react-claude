import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';

export { GoogleSignin };

export const GOOGLE_SIGN_IN_CANCELLED = 'GOOGLE_SIGN_IN_CANCELLED' as const;

/**
 * Performs the Google Sign-In SDK flow and returns the raw idToken.
 * Throws an error with code GOOGLE_SIGN_IN_CANCELLED when the user dismisses the picker.
 * All other errors bubble up for the caller to surface via toast.
 */
export async function getGoogleIdToken(): Promise<string> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result)) {
    const err: any = new Error('Google sign-in was cancelled');
    err.code = GOOGLE_SIGN_IN_CANCELLED;
    throw err;
  }
  const idToken = result.data.idToken;
  if (!idToken) throw new Error('Google sign-in did not return an ID token');
  return idToken;
}
