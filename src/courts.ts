import type { Defaults, Session } from './types.ts';

const BASE_COURTS = [1, 2, 3, 4];

/** Every court number to show as a tile: 1-4, the saved defaults, tonight's courts, and any just added. */
export function courtTiles(
  session: Session,
  defaults: Defaults,
  extra: number[] = [],
  known: number[] = [],
): number[] {
  const all = new Set([...BASE_COURTS, ...known, ...defaults.courts, ...session.config.courts, ...extra]);
  return [...all].sort((a, b) => a - b);
}

export function toggleCourt(courts: number[], court: number): number[] {
  const next = courts.includes(court) ? courts.filter((c) => c !== court) : [...courts, court];
  return next.sort((a, b) => a - b);
}
