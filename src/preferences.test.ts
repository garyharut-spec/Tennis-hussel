import { beforeEach, describe, expect, it } from 'vitest';
import { isSoundEnabled, isWallMode, setSoundEnabled, setWallMode } from './preferences.ts';

describe('preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
  });

  it('defaults sound off and persists when enabled', () => {
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
  });

  it('toggles wall mode and the body class together', () => {
    expect(isWallMode()).toBe(false);
    setWallMode(true);
    expect(isWallMode()).toBe(true);
    expect(document.body.classList.contains('wall-mode')).toBe(true);
    setWallMode(false);
    expect(document.body.classList.contains('wall-mode')).toBe(false);
  });
});
