import { describe, expect, it } from 'vitest';
import { courtTiles, toggleCourt } from './courts.ts';
import type { Defaults, Session } from './types.ts';

const base: Defaults = { courts: [1, 2, 3, 4], start: '19:00', end: '21:00', gameMinutes: 30, gapMinutes: 0, beginnerThreshold: 8 };
const sess = (courts: number[]): Session => ({ id: 'x', config: { ...base, courts }, attendance: [], rounds: [] });

describe('courtTiles', () => {
  it('unions 1-4, defaults, session courts and extras, sorted', () => {
    expect(courtTiles(sess([3, 7]), { ...base, courts: [3, 7, 12] })).toEqual([1, 2, 3, 4, 7, 12]);
    expect(courtTiles(sess([3]), base, [9])).toEqual([1, 2, 3, 4, 9]);
  });
});

describe('toggleCourt', () => {
  it('removes when present and adds sorted when absent', () => {
    expect(toggleCourt([2, 3], 3)).toEqual([2]);
    expect(toggleCourt([2], 1)).toEqual([1, 2]);
  });
});
