import { beforeEach, describe, expect, it } from 'vitest';
import { en } from './en.ts';
import { nl } from './nl.ts';
import { getLanguage, setLanguage, t } from './index.ts';
import { formatDecimal, parseDecimal } from './number.ts';

describe('dictionaries', () => {
  it('have the exact same set of keys', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
  });
});

describe('t()', () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage('en');
  });

  it('translates a plain key in the active language', () => {
    expect(t('tab_now')).toBe('Now');
    setLanguage('nl');
    expect(t('tab_now')).toBe('Nu');
  });

  it('pluralises via a function key', () => {
    expect(t('playerCount', 1)).toBe('1 player');
    expect(t('playerCount', 2)).toBe('2 players');
    setLanguage('nl');
    expect(t('playerCount', 1)).toBe('1 speler');
    expect(t('playerCount', 2)).toBe('2 spelers');
  });

  it('persists the choice and updates document language', () => {
    setLanguage('nl');
    expect(getLanguage()).toBe('nl');
    expect(document.documentElement.lang).toBe('nl');
    expect(localStorage.getItem('hussel:language')).toBe('nl');
  });
});

describe('formatDecimal / parseDecimal', () => {
  it('formats with a dot in English and a comma in Dutch', () => {
    expect(formatDecimal(4.5, 'en')).toBe('4.5');
    expect(formatDecimal(4.5, 'nl')).toBe('4,5');
  });

  it('parses either separator', () => {
    expect(parseDecimal('4.5')).toBe(4.5);
    expect(parseDecimal('4,5')).toBe(4.5);
  });

  it('rejects non-numeric input', () => {
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('')).toBeNull();
  });
});
