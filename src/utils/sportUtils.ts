import type { Sport } from '../types';

/**
 * Mutable registry populated at app startup from the `/api/v1/sports` response.
 * Falls back to the static mock icons if empty (demo mode).
 */
let _registry: Sport[] = [];

export function setSportsRegistry(sports: Sport[]) {
  _registry = sports;
}

const FALLBACK_ICON: Record<string, string> = {
  Football: '⚽', Cricket: '🏏', Badminton: '🏸',
  Tennis: '🎾', Basketball: '🏀', Volleyball: '🏐',
};

export function getSportName(id: string): string {
  return _registry.find((s) => s.id === id)?.name ?? id;
}

export function getSportIcon(id: string): string {
  const sport = _registry.find((s) => s.id === id);
  if (sport) return sport.icon;
  return FALLBACK_ICON[id] ?? '🎯';
}
