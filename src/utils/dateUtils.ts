import { useState, useEffect } from 'react';

/**
 * Normalises a backend ISO 8601 string so new Date() parses it correctly:
 *  1. Truncates fractional seconds to 3 digits — Hermes only handles ms precision,
 *     Java Instant / LocalDateTime can emit up to 9 digits.
 *  2. Appends 'Z' when no timezone designator is present so the value is always
 *     interpreted as UTC, not device-local time.
 */
function parseIso(iso: string): Date {
  const ms3  = iso.replace(/(\.\d{3})\d+/, '$1');           // ".430276" → ".430"
  const utc  = /Z|[+-]\d{2}:?\d{2}$/.test(ms3) ? ms3 : ms3 + 'Z';
  return new Date(utc);
}

/**
 * Formats an ISO timestamp as a human-readable relative or absolute string.
 *
 * Relative  : "Just now", "5m ago", "3h ago", "Yesterday", "3d ago"
 * Absolute  : "7 Jun" for notifications older than a week
 * Clock-skew: when the server stamp is ahead of the device clock (negative
 *             diff), we show the actual time "10:23 PM" so the user always
 *             sees something meaningful instead of "Just now" forever.
 */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '';

  const d = parseIso(iso);
  if (isNaN(d.getTime())) return '';

  const diffMs   = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  // Server timestamp is ahead of device clock — show the clock time so the
  // user doesn't see "Just now" for notifications that are hours / days old.
  if (diffMs < 0) {
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    });
  }

  if (diffMins  <  1) return 'just now';
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHrs   < 24) return `${diffHrs}h ago`;
  if (diffDays  === 1) return 'yesterday';
  if (diffDays  <  7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}

/**
 * Causes the calling component to re-render every `intervalMs` ms so that
 * relative timestamps ("5m ago") tick forward without waiting for a refetch.
 */
export function useNow(intervalMs = 30_000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
