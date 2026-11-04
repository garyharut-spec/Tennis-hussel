import { describe, expect, it } from 'vitest';
import { ensureSession, todayId } from './session.ts';
import { DEFAULT_DEFAULTS } from './storage.ts';
import type { AppData } from './types.ts';

function emptyData(): AppData {
  return { version: 1, roster: [], defaults: DEFAULT_DEFAULTS, history: [], currentSession: null };
}

describe('ensureSession', () => {
  it('creates a session seeded from defaults when none exists', () => {
    const data = emptyData();
    const now = new Date('2026-11-05T10:00:00Z');
    const session = ensureSession(data, now);

    expect(session.id).toBe(todayId(now));
    expect(session.config).toEqual(DEFAULT_DEFAULTS);
    expect(session.attendance).toEqual([]);
    expect(data.currentSession).toBe(session);
  });

  it('returns the existing session unchanged on a second call', () => {
    const data = emptyData();
    const first = ensureSession(data);
    first.config.courts = [1, 2];
    const second = ensureSession(data);

    expect(second).toBe(first);
    expect(second.config.courts).toEqual([1, 2]);
  });
});
