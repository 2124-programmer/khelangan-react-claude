import * as SecureStore from 'expo-secure-store';
import { Appearance, Platform } from 'react-native';

/**
 * App theme preference: follow the device ('system') or force 'light'/'dark'.
 *
 * The active palette is resolved synchronously when `src/theme` first evaluates, but the saved
 * preference lives in async storage — so it's loaded ONCE at the very start (see RootGate) before
 * the app (and theme) are imported, and cached here for synchronous reads. Changing the preference
 * persists it and reloads the app so every static style repaints with the new palette.
 */
export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'theme_pref';
const isWeb = Platform.OS === 'web';

function isPref(v: unknown): v is ThemePref {
  return v === 'light' || v === 'dark' || v === 'system';
}

/**
 * Platform-aware persistence. `expo-secure-store` has no web implementation and throws there,
 * so on web we fall back to localStorage (synchronous) — mirroring `api/tokenStorage`. On web the
 * read is synchronous, which lets us prime the cache at module load (below) so the palette resolves
 * correctly even if the startup gate hasn't run yet.
 */
async function readPref(): Promise<ThemePref | null> {
  if (isWeb) {
    try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; return isPref(v) ? v : null; }
    catch { return null; }
  }
  try { const v = await SecureStore.getItemAsync(KEY); return isPref(v) ? v : null; }
  catch { return null; }
}

async function writePref(pref: ThemePref): Promise<void> {
  if (isWeb) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, pref); } catch { /* ignore */ }
    return;
  }
  try { await SecureStore.setItemAsync(KEY, pref); } catch { /* ignore — in-memory value still applies */ }
}

// On web, localStorage is synchronous — prime the cache immediately so the static palette resolves
// to the saved choice even before loadThemePref() runs. (Native primes via loadThemePref in RootGate.)
let cached: ThemePref = 'system';
if (isWeb) {
  try { const v = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; if (isPref(v)) cached = v; }
  catch { /* ignore */ }
}

/** Synchronous current preference (defaults to 'system' until loadThemePref runs). */
export function getThemePref(): ThemePref {
  return cached;
}

/** Load the persisted preference into the cache. Call before importing the app/theme. */
export async function loadThemePref(): Promise<ThemePref> {
  const v = await readPref();
  if (v) cached = v;
  applyNativeOverride();
  return cached;
}

/** Persist a new preference (caller reloads the app afterwards to repaint static styles). */
export async function setThemePref(pref: ThemePref): Promise<void> {
  cached = pref;
  applyNativeOverride();
  await writePref(pref);
}

/** Keep RN's Appearance in sync so `useColorScheme()` consumers match the forced theme (native only). */
function applyNativeOverride(): void {
  if (Platform.OS === 'web') return;
  try {
    Appearance.setColorScheme(cached === 'system' ? null : cached);
  } catch {
    // setColorScheme may be unavailable on some platforms — non-fatal
  }
}

/** Resolve the concrete scheme for the static palette: explicit preference, else the OS scheme. */
export function resolveColorScheme(): 'light' | 'dark' {
  if (cached === 'light') return 'light';
  if (cached === 'dark') return 'dark';
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}
