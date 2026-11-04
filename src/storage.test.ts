import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DEFAULTS, exportJson, importJson, load, save } from './storage.ts';
import type { AppData } from './types.ts';

describe('load', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty data with the default defaults when nothing is stored', () => {
    const data = load();
    expect(data.roster).toEqual([]);
    expect(data.currentSession).toBeNull();
    expect(data.defaults).toEqual(DEFAULT_DEFAULTS);
  });

  it('round-trips through save/load', () => {
    const data = load();
    data.roster.push({ id: 'm1', firstName: 'Anna', level: 4.5 });
    save(data);

    const reloaded = load();
    expect(reloaded.roster).toEqual([{ id: 'm1', firstName: 'Anna', level: 4.5 }]);
  });

  it('falls back to empty data for corrupted JSON', () => {
    localStorage.setItem('hussel:data', 'not json');
    expect(load().roster).toEqual([]);
  });
});

describe('exportJson / importJson', () => {
  it('round-trips valid data', () => {
    const data: AppData = {
      version: 1,
      roster: [{ id: 'm1', firstName: 'Anna', level: 4.5 }],
      defaults: DEFAULT_DEFAULTS,
      history: [{ date: '2026-10-29', players: 22, courts: 4, rounds: 6 }],
      currentSession: null,
    };
    expect(importJson(exportJson(data))).toEqual(data);
  });

  it('rejects invalid JSON', () => {
    expect(() => importJson('not json')).toThrow();
  });

  it('rejects a well-formed JSON value that is not Hussel data', () => {
    expect(() => importJson(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  it('rejects an unsupported version', () => {
    const data = { version: 99, roster: [], defaults: DEFAULT_DEFAULTS, history: [], currentSession: null };
    expect(() => importJson(JSON.stringify(data))).toThrow();
  });

  it('rejects a history entry with a non-numeric field (e.g. an HTML-injection attempt)', () => {
    const data = {
      version: 1,
      roster: [],
      defaults: DEFAULT_DEFAULTS,
      history: [{ date: '2026-10-29', players: 22, courts: '<img src=x onerror=alert(1)>', rounds: 6 }],
      currentSession: null,
    };
    expect(() => importJson(JSON.stringify(data))).toThrow();
  });

  it('rejects a roster member with a non-string name', () => {
    const data = {
      version: 1,
      roster: [{ id: 'm1', firstName: 123, level: 4.5 }],
      defaults: DEFAULT_DEFAULTS,
      history: [],
      currentSession: null,
    };
    expect(() => importJson(JSON.stringify(data))).toThrow();
  });

  it('rejects a session with a malformed round', () => {
    const data = {
      version: 1,
      roster: [],
      defaults: DEFAULT_DEFAULTS,
      history: [],
      currentSession: {
        id: '2026-11-05',
        config: DEFAULT_DEFAULTS,
        attendance: [],
        rounds: [{ index: 0, start: '19:00', games: [{ court: 1, teamA: ['a', 'b'], teamB: ['c'] }], sittingOut: [], locked: false }],
      },
    };
    expect(() => importJson(JSON.stringify(data))).toThrow();
  });

  it('accepts a well-formed session and round-trips it', () => {
    const data: AppData = {
      version: 1,
      roster: [{ id: 'm1', firstName: 'Anna', level: 4.5 }],
      defaults: DEFAULT_DEFAULTS,
      history: [],
      currentSession: {
        id: '2026-11-05',
        config: DEFAULT_DEFAULTS,
        attendance: [{ memberId: 'm1', from: '19:00', until: null }],
        rounds: [{ index: 0, start: '19:00', games: [{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] }], sittingOut: ['e'], locked: false }],
      },
    };
    expect(importJson(exportJson(data))).toEqual(data);
  });
});
