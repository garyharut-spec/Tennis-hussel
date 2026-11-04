import { describe, expect, it } from 'vitest';
import { playChangeoverAlert } from './changeoverAlert.ts';

describe('playChangeoverAlert', () => {
  it('does not throw when AudioContext/vibrate are unavailable (as in this test environment)', () => {
    expect(() => playChangeoverAlert()).not.toThrow();
  });
});
