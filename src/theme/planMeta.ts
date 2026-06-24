import { useColorScheme } from 'react-native';
import type { PlanCode } from '../types';

/**
 * Single source of truth for plan DISPLAY: name, ordering rank, one-line blurb, and the per-plan
 * color tokens (soft bg + strong text, for light and dark). This is the ONLY place a plan's name or
 * color lives — `PlanBadge`/`PlanComparison`/`PlanInfoSheet` all read from here, nothing hard-codes a
 * plan string or hue inline.
 *
 * Plan color is intentionally distinct from subscription-STATUS color (status keeps its green/amber/
 * red semantic pill). Price, court limit, and duration are NOT here — they come from the live
 * subscription-plans query so backend changes reflect with no client edit.
 */

export interface PlanColorTokens {
  bg: string;   // soft tinted background
  text: string; // strong same-family text
}

export interface PlanMetaEntry {
  name: string;
  rank: number;
  blurb: string;
  light: PlanColorTokens;
  dark: PlanColorTokens;
}

export const PLAN_META: Record<PlanCode, PlanMetaEntry> = {
  TRIAL: {
    name: 'Trial',
    rank: 0,
    blurb: 'Free 30-day trial to get your venue live.',
    light: { bg: '#F1EFE8', text: '#444441' },
    dark: { bg: '#444441', text: '#D3D1C7' },
  },
  STARTER: {
    name: 'Starter',
    rank: 1,
    blurb: 'For small venues — up to 2 courts.',
    light: { bg: '#E6F1FB', text: '#0C447C' },
    dark: { bg: '#0C447C', text: '#B5D4F4' },
  },
  GROWTH: {
    name: 'Growth',
    rank: 2,
    blurb: 'Room to grow — up to 4 courts.',
    light: { bg: '#E1F5EE', text: '#085041' },
    dark: { bg: '#085041', text: '#9FE1CB' },
  },
  PRO: {
    name: 'Pro',
    rank: 3,
    blurb: 'For busy venues — up to 6 courts.',
    light: { bg: '#EEEDFE', text: '#3C3489' },
    dark: { bg: '#3C3489', text: '#CECBF6' },
  },
  PRO_MAX: {
    name: 'Pro Max',
    rank: 4,
    blurb: 'Maximum reach — up to 12 courts.',
    light: { bg: '#FAECE7', text: '#712B13' },
    dark: { bg: '#712B13', text: '#F5C4B3' },
  },
};

/**
 * Resolve a plan CODE or display NAME to a {@link PlanCode}. Tolerant of casing and the "Pro Max"
 * spacing/hyphen so call sites that only have a `planName` string can still render a `PlanBadge`.
 * Returns null for unknown/empty values (callers fall back to plain text).
 */
export function resolvePlanCode(value?: string | null): PlanCode | null {
  if (!value) return null;
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return (key in PLAN_META ? (key as PlanCode) : null);
}

/** The plan metadata entry. */
export function getPlanMeta(plan: PlanCode): PlanMetaEntry {
  return PLAN_META[plan];
}

/** Plan codes in display order (Trial → Pro Max). */
export const PLAN_CODES_BY_RANK: PlanCode[] =
  (Object.keys(PLAN_META) as PlanCode[]).sort((a, b) => PLAN_META[a].rank - PLAN_META[b].rank);

/**
 * Plan name + the color tokens for the active color scheme. Used by the plan components so a single
 * change here (color or name) updates every surface.
 */
export function usePlanMeta(plan: PlanCode): { name: string; rank: number; blurb: string } & PlanColorTokens {
  const scheme = useColorScheme();
  const entry = PLAN_META[plan];
  const tokens = scheme === 'dark' ? entry.dark : entry.light;
  return { name: entry.name, rank: entry.rank, blurb: entry.blurb, bg: tokens.bg, text: tokens.text };
}
