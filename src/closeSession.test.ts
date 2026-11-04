import { describe, expect, it } from 'vitest';
import { closeSession } from './closeSession.ts';
import { DEFAULT_DEFAULTS } from './storage.ts';
import type { AppData } from './types.ts';

function data(): AppData {
  return {
    version: 1,
    roster: [{ id: 'm1', firstName: 'Anna', level: 4.5 }],
    defaults: DEFAULT_DEFAULTS,
    history: [],
    currentSession: {
      id: '2026-11-05',
      config: DEFAULT_DEFAULTS,
      attendance: [
        { memberId: 'm1', from: '19:00', until: null },
        { memberId: 'm2', from: '19:00', until: '20:00' },
      ],
      rounds: [{ index: 0, start: '19:00', locked: false, sittingOut: [], games: [{ court: 1, teamA: ['m1', 'm2'], teamB: ['m3', 'm4'] }] }],
    },
  };
}

describe('closeSession', () => {
  it('appends a headcount-only entry and clears the session', () => {
    const d = data();
    closeSession(d);

    expect(d.history).toEqual([{ date: '2026-11-05', players: 2, courts: 4, rounds: 1 }]);
    expect(d.currentSession).toBeNull();
  });

  it('leaves the roster untouched', () => {
    const d = data();
    closeSession(d);
    expect(d.roster).toEqual([{ id: 'm1', firstName: 'Anna', level: 4.5 }]);
  });

  it('does nothing when there is no current session', () => {
    const d = data();
    d.currentSession = null;
    closeSession(d);
    expect(d.history).toEqual([]);
  });
});
