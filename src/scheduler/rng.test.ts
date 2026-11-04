import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from './rng.ts';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('returns a permutation of the same elements', () => {
    const rng = createRng(3);
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, rng);
    expect(result).toHaveLength(input.length);
    expect([...result].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const rng = createRng(3);
    const input = [1, 2, 3];
    shuffle(input, rng);
    expect(input).toEqual([1, 2, 3]);
  });
});
