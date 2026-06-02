import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'turfbook_jwt';
const REFRESH_KEY = 'turfbook_refresh';

// expo-secure-store only works on native (iOS/Android).
// On web it throws because the underlying native module is absent.
// Fall back to localStorage — not encrypted, acceptable for dev/web.
async function read(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
  await SecureStore.setItemAsync(key, value);
}

async function remove(key: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string): Promise<void> {
  await write(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return read(TOKEN_KEY);
}

export async function saveRefreshToken(token: string): Promise<void> {
  await write(REFRESH_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return read(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await remove(TOKEN_KEY);
  await remove(REFRESH_KEY);
}
