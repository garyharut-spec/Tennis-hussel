import { describe, expect, it } from 'vitest';
import { gamesPlayedThisSession } from './stats.ts';
import type { Session } from './types.ts';

function session(rounds: Session['rounds']): Session {
  return { id: '2026-11-05', config: { courts: [1], start: '19:00', end: '20:00', gameMinutes: 30, gapMinutes: 0, beginnerThreshold: 8 }, attendance: [], rounds };
}

describe('gamesPlayedThisSession', () => {
  it('counts each appearance across all rounds', () => {
    const s = session([
      { index: 0, start: '19:00', locked: false, sittingOut: ['e'], games: [{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] }] },
      { index: 1, start: '19:30', locked: false, sittingOut: ['a'], games: [{ court: 1, teamA: ['b', 'c'], teamB: ['d', 'e'] }] },
    ]);

    const counts = gamesPlayedThisSession(s);
    expect(counts.get('a')).toBe(1);
    expect(counts.get('b')).toBe(2);
    expect(counts.get('e')).toBe(1);
  });

  it('returns an empty map for a session with no rounds yet', () => {
    expect(gamesPlayedThisSession(session([])).size).toBe(0);
  });
});
