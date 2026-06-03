/**
 * Parses the canonical "lat, lng" string owners enter in the form.
 * Returns null if the string is empty, malformed, or out of valid range.
 */
export function parseLatLng(value: string): { lat: number; lng: number } | null {
  const parts = value.split(',').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Serialises coords back to the canonical string stored in the form field. */
export function formatLatLng(lat: number, lng: number): string {
  return `${lat}, ${lng}`;
}

/** Haversine formula — returns distance between two GPS points in km. */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Human-readable distance string.
 * < 1 km → "850 m away"
 * ≥ 1 km → "2.3 km away"
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}
