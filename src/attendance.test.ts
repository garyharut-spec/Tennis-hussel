import { describe, expect, it } from 'vitest';
import { isPresent, presentCount, setPresent } from './attendance.ts';
import type { Session } from './types.ts';

function emptySession(): Session {
  return { id: '2026-11-05', config: { courts: [1], start: '19:00', end: '22:00', gameMinutes: 30, gapMinutes: 0, beginnerThreshold: 8 }, attendance: [], rounds: [] };
}

describe('setPresent / isPresent / presentCount', () => {
  it('marks a new member present', () => {
    const session = emptySession();
    setPresent(session, 'm1', true, new Date('2026-11-05T19:00:00Z'));

    expect(isPresent(session, 'm1')).toBe(true);
    expect(presentCount(session)).toBe(1);
  });

  it('marks a present member as left without deleting the record', () => {
    const session = emptySession();
    setPresent(session, 'm1', true, new Date('2026-11-05T19:00:00Z'));
    setPresent(session, 'm1', false, new Date('2026-11-05T20:00:00Z'));

    expect(isPresent(session, 'm1')).toBe(false);
    expect(presentCount(session)).toBe(0);
    expect(session.attendance).toHaveLength(1);
    expect(session.attendance[0]?.until).toBe('2026-11-05T20:00:00.000Z');
  });

  it('marking present again after leaving reopens the same record', () => {
    const session = emptySession();
    setPresent(session, 'm1', true);
    setPresent(session, 'm1', false);
    setPresent(session, 'm1', true);

    expect(isPresent(session, 'm1')).toBe(true);
    expect(session.attendance).toHaveLength(1);
  });

  it('is false/zero for a member never added', () => {
    const session = emptySession();
    expect(isPresent(session, 'ghost')).toBe(false);
    expect(presentCount(session)).toBe(0);
  });
});
