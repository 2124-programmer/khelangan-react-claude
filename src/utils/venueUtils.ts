import { Platform } from 'react-native';

// ─── Address helpers ──────────────────────────────────────────────────────────

/**
 * Builds a clean, de-duplicated address string from structured venue fields.
 * Handles the common case where the `address` field already contains the city
 * or pincode (e.g. "Nashik,adgaon,422001" + city="nashik" + pincode="422001").
 * Output: "Adgaon, Nashik, Maharashtra 422001"
 */
export function formatVenueAddress(
  address: string,
  city: string,
  state: string,
  pincode: string,
): string {
  const cityLower = city.toLowerCase().trim();
  const pincodeClean = pincode.trim();

  const cleanedParts = address
    .split(',')
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      const lower = p.toLowerCase();
      if (lower === cityLower) return false;
      if (p === pincodeClean) return false;
      if (/^\d{6}$/.test(p)) return false; // any 6-digit code is a pincode
      return true;
    })
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)); // capitalize first letter

  const statePincode =
    state && pincode ? `${state} ${pincode}` : state || pincode;

  return [...cleanedParts, city, statePincode].filter(Boolean).join(', ');
}

// ─── Open/closed status ───────────────────────────────────────────────────────

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${period}`;
}

function getISTMinutes(): number {
  const now = new Date();
  const istStr = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = istStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export interface OpenStatus {
  isOpen: boolean;
  label: string;
}

/**
 * Returns open/closed status computed against current IST time.
 * openTime / closeTime are "HH:00" strings from the API.
 */
export function getOpenStatus(openTime: string, closeTime: string): OpenStatus {
  const nowMins = getISTMinutes();
  const openMins = parseHHMM(openTime);
  const closeMins = parseHHMM(closeTime);
  const isOpen = nowMins >= openMins && nowMins < closeMins;
  const label = isOpen
    ? `Open now · closes ${fmt12h(closeTime)}`
    : `Closed · opens ${fmt12h(openTime)}`;
  return { isOpen, label };
}

// ─── Directions helper ────────────────────────────────────────────────────────

/**
 * Returns the device-appropriate maps URL for directions.
 * Falls back to Google Maps search when coordinates are unavailable.
 */
export function getMapsUrl(
  lat: number,
  lng: number,
  name: string,
  fullAddress: string,
): string {
  const hasCoords = lat !== 0 && lng !== 0;
  if (hasCoords) {
    const nativePlatform = Platform.select({
      ios: `maps://?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
    });
    return nativePlatform ?? `https://maps.google.com/maps?q=${lat},${lng}`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`;
}
