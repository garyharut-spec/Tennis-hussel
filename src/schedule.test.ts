import { describe, expect, it } from 'vitest';
import { setPresent } from './attendance.ts';
import { currentRoundIndex, firstReplanIndex, roundStatus, needsReplan, regenerateFrom, setRoundLocked, setRoundNotes, timeGridFor } from './schedule.ts';
import { DEFAULT_DEFAULTS } from './storage.ts';
import type { AppData, Member, Session } from './types.ts';

function makeData(members: Member[]): { data: AppData; session: Session } {
  const data: AppData = {
    version: 1,
    roster: members,
    defaults: DEFAULT_DEFAULTS,
    history: [],
    currentSession: null,
  };
  const session: Session = {
    id: '2026-11-05',
    config: { ...DEFAULT_DEFAULTS, start: '19:00', end: '20:00' },
    attendance: [],
    rounds: [],
  };
  data.currentSession = session;
  return { data, session };
}

function members(n: number): Member[] {
  return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, firstName: `P${i}`, level: 4.0 }));
}

describe('regenerateFrom', () => {
  it('schedules only the present players', () => {
    const { data, session } = makeData(members(8));
    for (const m of data.roster.slice(0, 4)) setPresent(session, m.id, true);

    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));

    expect(session.rounds).toHaveLength(2); // 19:00-20:00 at 30 min each
    const firstRoundPlayers = session.rounds[0]!.games.flatMap((g) => [...g.teamA, ...g.teamB]);
    expect(firstRoundPlayers.sort()).toEqual(['m0', 'm1', 'm2', 'm3']);
  });

  it('a second regenerate call with a different "now" produces a different arrangement', () => {
    const { data, session } = makeData(members(8));
    for (const m of data.roster) setPresent(session, m.id, true);

    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));
    const first = JSON.stringify(session.rounds);

    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:05'));
    const second = JSON.stringify(session.rounds);

    expect(first).not.toBe(second);
  });

  it('preserves a locked round across regenerate', () => {
    const { data, session } = makeData(members(8));
    for (const m of data.roster) setPresent(session, m.id, true);
    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));
    setRoundLocked(session, 1, true);
    const lockedRound = session.rounds[1];

    regenerateFrom(data, session, 0, new Date('2026-11-05T19:05:00'));

    expect(session.rounds[1]).toEqual(lockedRound);
  });
});

describe('setRoundNotes', () => {
  it('sets and clears notes on a round', () => {
    const { data, session } = makeData(members(4));
    for (const m of data.roster) setPresent(session, m.id, true);
    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));

    setRoundNotes(session, 0, 'Court 2 is wet');
    expect(session.rounds[0]!.notes).toBe('Court 2 is wet');

    setRoundNotes(session, 0, '');
    expect(session.rounds[0]!.notes).toBeUndefined();
  });
});

describe('currentRoundIndex', () => {
  it('maps a time within the grid to the right round', () => {
    const { session } = makeData([]);
    expect(currentRoundIndex(session, new Date('2026-11-05T19:10:00'))).toBe(0);
    expect(currentRoundIndex(session, new Date('2026-11-05T19:35:00'))).toBe(1);
  });

  it('clamps to the last round once the night is over', () => {
    const { session } = makeData([]);
    expect(currentRoundIndex(session, new Date('2026-11-05T23:00:00'))).toBe(timeGridFor(session).length - 1);
  });
});

describe('needsReplan', () => {
  it('is true before anything has been generated', () => {
    const { data, session } = makeData(members(4));
    expect(needsReplan(data, session, 0)).toBe(true);
  });

  it('is false right after a matching regenerate', () => {
    const { data, session } = makeData(members(4));
    for (const m of data.roster) setPresent(session, m.id, true);
    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));

    expect(needsReplan(data, session, 0)).toBe(false);
  });

  it('is true once someone present was not part of the generated rounds', () => {
    const { data, session } = makeData(members(4));
    for (const m of data.roster) setPresent(session, m.id, true);
    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));

    data.roster.push({ id: 'late', firstName: 'Late', level: 4.0 });
    setPresent(session, 'late', true);

    expect(needsReplan(data, session, 0)).toBe(true);
  });

  it('ignores a player who left after their locked round, once future rounds are replanned', () => {
    const { data, session } = makeData(members(4));
    for (const m of data.roster) setPresent(session, m.id, true);
    regenerateFrom(data, session, 0, new Date('2026-11-05T19:00:00'));
    setRoundLocked(session, 0, true);

    setPresent(session, 'm0', false);
    regenerateFrom(data, session, 1, new Date('2026-11-05T19:30:00'));

    expect(needsReplan(data, session, 1)).toBe(false);
  });
});

describe('roundStatus / firstReplanIndex', () => {
  const sess = (): Session => ({
    id: 'x',
    config: { ...DEFAULT_DEFAULTS, start: '19:00', end: '21:00', gameMinutes: 30, gapMinutes: 0 },
    attendance: [],
    rounds: [],
  });
  const at = (hhmm: string) => new Date(`2026-11-10T${hhmm}:00`);

  it('marks now, next and future during the evening', () => {
    const s = sess();
    expect([0, 1, 2].map((i) => roundStatus(s, i, at('19:10')))).toEqual(['now', 'next', 'future']);
    expect(firstReplanIndex(s, at('19:10'))).toBe(1);
  });
  it('has no "now" round before the evening starts', () => {
    const s = sess();
    expect([0, 1].map((i) => roundStatus(s, i, at('18:00')))).toEqual(['next', 'future']);
    expect(firstReplanIndex(s, at('18:00'))).toBe(0);
  });
  it('moves on at a round boundary', () => {
    const s = sess();
    expect([0, 1].map((i) => roundStatus(s, i, at('19:30')))).toEqual(['past', 'now']);
    expect(firstReplanIndex(s, at('19:30'))).toBe(2);
  });
  it('treats everything as past after the end', () => {
    const s = sess();
    expect([0, 3].map((i) => roundStatus(s, i, at('21:30')))).toEqual(['past', 'past']);
    expect(firstReplanIndex(s, at('21:30'))).toBe(4);
  });
});
