import { describe, expect, it } from 'vitest';
import { displayName, hasNameClash } from './members.ts';
import type { Member } from './types.ts';

describe('displayName', () => {
  it('is just the first name with no clash', () => {
    expect(displayName({ id: '1', firstName: 'Anna', level: 4.5 })).toBe('Anna');
  });

  it('appends the last initial when set', () => {
    expect(displayName({ id: '1', firstName: 'Anna', lastInitial: 'K', level: 4.5 })).toBe('Anna K.');
  });
});

describe('hasNameClash', () => {
  const roster: Member[] = [{ id: '1', firstName: 'Anna', level: 4.5 }];

  it('is true for a case-insensitive duplicate first name', () => {
    expect(hasNameClash(roster, 'anna')).toBe(true);
  });

  it('is false for a distinct name', () => {
    expect(hasNameClash(roster, 'Bram')).toBe(false);
  });

  it('excludes the member being edited', () => {
    expect(hasNameClash(roster, 'Anna', '1')).toBe(false);
  });
});
