import { describe, expect, it } from 'vitest';
import { roundsPlayedBefore, roundsPlayedByPlayer } from './roundsPlayed.ts';
import type { Session } from './types.ts';

function session(): Session {
  return {
    id: 'x',
    config: { courts: [1], start: '19:00', end: '20:30', gameMinutes: 30, gapMinutes: 0, beginnerThreshold: 8 },
    attendance: [],
    rounds: [
      { index: 0, start: '19:00', locked: false, sittingOut: ['e'], games: [{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] }] },
      { index: 1, start: '19:30', locked: false, sittingOut: ['a'], games: [{ court: 1, teamA: ['b', 'c'], teamB: ['d', 'e'] }] },
      { index: 2, start: '20:00', locked: false, sittingOut: ['b'], games: [{ court: 1, teamA: ['a', 'c'], teamB: ['d', 'e'] }] },
    ],
  };
}

describe('roundsPlayedBefore', () => {
  it('counts rounds played strictly before the given round', () => {
    const s = session();
    expect(roundsPlayedBefore(s, 'a', 0)).toBe(0);
    expect(roundsPlayedBefore(s, 'a', 1)).toBe(1);
    expect(roundsPlayedBefore(s, 'a', 2)).toBe(1);
    expect(roundsPlayedBefore(s, 'a', 3)).toBe(2);
  });
  it('is 0 for an unknown player', () => {
    expect(roundsPlayedBefore(session(), 'zz', 3)).toBe(0);
  });
});

describe('roundsPlayedByPlayer', () => {
  it('counts all rounds', () => {
    const m = roundsPlayedByPlayer(session());
    expect(m.get('a')).toBe(2);
    expect(m.get('e')).toBe(2);
    expect(m.get('zz')).toBeUndefined();
  });
});
