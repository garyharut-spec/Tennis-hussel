import { describe, expect, it } from 'vitest';
import { swapPlayers } from './manualEdit.ts';
import type { Round } from './types.ts';

function round(overrides: Partial<Round> = {}): Round {
  return {
    index: 0,
    start: '19:00',
    locked: false,
    games: [
      { court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'] },
      { court: 2, teamA: ['e', 'f'], teamB: ['g', 'h'] },
    ],
    sittingOut: ['i', 'j'],
    ...overrides,
  };
}

describe('swapPlayers', () => {
  it('swaps two players on different courts', () => {
    const r = round();
    const result = swapPlayers(r, 'a', 'e');
    expect(result.ok).toBe(true);
    expect(r.games[0]!.teamA).toEqual(['e', 'b']);
    expect(r.games[1]!.teamA).toEqual(['a', 'f']);
  });

  it('benches a court player by swapping with a specific sitting-out player', () => {
    const r = round();
    const result = swapPlayers(r, 'a', 'i');
    expect(result.ok).toBe(true);
    expect(r.games[0]!.teamA).toEqual(['i', 'b']);
    expect(r.sittingOut).toEqual(['a', 'j']);
  });

  it('swaps teammates within the same game', () => {
    const r = round();
    const result = swapPlayers(r, 'a', 'b');
    expect(result.ok).toBe(true);
    expect(r.games[0]!.teamA).toEqual(['b', 'a']);
  });

  it('clears explanations on games it touches, since they no longer apply', () => {
    const r = round({ games: [{ court: 1, teamA: ['a', 'b'], teamB: ['c', 'd'], explanations: [{ code: 'ODD_BEGINNERS' }] }] });
    swapPlayers(r, 'a', 'c');
    expect(r.games[0]!.explanations).toBeUndefined();
  });

  it('rejects a swap on a locked round', () => {
    const r = round({ locked: true });
    const result = swapPlayers(r, 'a', 'e');
    expect(result).toEqual({ ok: false, reason: 'LOCKED' });
    expect(r.games[0]!.teamA).toEqual(['a', 'b']);
  });

  it('rejects swapping a player with themselves', () => {
    const r = round();
    expect(swapPlayers(r, 'a', 'a')).toEqual({ ok: false, reason: 'NOOP' });
  });

  it('rejects swapping two sitting-out players (no-op)', () => {
    const r = round();
    expect(swapPlayers(r, 'i', 'j')).toEqual({ ok: false, reason: 'NOOP' });
  });

  it('rejects an unknown player id', () => {
    const r = round();
    expect(swapPlayers(r, 'a', 'ghost')).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
});
