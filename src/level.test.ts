import { describe, expect, it } from 'vitest';
import { isBeginner, parseLevel } from './level.ts';

describe('parseLevel', () => {
  it('accepts valid one-decimal values within range', () => {
    expect(parseLevel('4.5')).toBe(4.5);
    expect(parseLevel('1')).toBe(1);
    expect(parseLevel('9')).toBe(9);
    expect(parseLevel('9.0')).toBe(9);
    expect(parseLevel('1.0')).toBe(1);
  });

  it('accepts a comma as the decimal separator', () => {
    expect(parseLevel('4,5')).toBe(4.5);
  });

  it('rejects values with more than one decimal digit', () => {
    expect(parseLevel('6.95')).toBeNull();
  });

  it('rejects out-of-range values', () => {
    expect(parseLevel('0')).toBeNull();
    expect(parseLevel('9.1')).toBeNull();
  });

  it('rejects non-numeric input', () => {
    expect(parseLevel('abc')).toBeNull();
    expect(parseLevel('')).toBeNull();
  });
});

describe('isBeginner', () => {
  it('is true at and above the threshold, false just below it', () => {
    expect(isBeginner(7.9)).toBe(false);
    expect(isBeginner(8.0)).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(isBeginner(7.0, 7.0)).toBe(true);
    expect(isBeginner(6.9, 7.0)).toBe(false);
  });
});
