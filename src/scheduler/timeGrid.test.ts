import { describe, expect, it } from 'vitest';
import { computeTimeGrid } from './timeGrid.ts';

describe('computeTimeGrid', () => {
  it('builds a full grid of 30-minute rounds with no gap', () => {
    const grid = computeTimeGrid('19:00', '22:00', 30, 0);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual({ index: 0, start: '19:00', end: '19:30' });
    expect(grid[5]).toEqual({ index: 5, start: '21:30', end: '22:00' });
  });

  it('accounts for a gap between games', () => {
    const grid = computeTimeGrid('19:00', '20:30', 25, 5);
    expect(grid.map((s) => s.start)).toEqual(['19:00', '19:30', '20:00']);
  });

  it('drops a trailing partial round when the window is not a multiple of the slot length', () => {
    const grid = computeTimeGrid('19:00', '21:50', 30, 0);
    expect(grid).toHaveLength(5);
    expect(grid.at(-1)).toEqual({ index: 4, start: '21:00', end: '21:30' });
  });

  it('returns an empty grid when end is not after start', () => {
    expect(computeTimeGrid('22:00', '22:00', 30, 0)).toEqual([]);
    expect(computeTimeGrid('22:00', '19:00', 30, 0)).toEqual([]);
  });
});
