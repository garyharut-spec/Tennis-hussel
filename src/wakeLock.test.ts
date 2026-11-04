import { describe, expect, it } from 'vitest';
import { releaseWakeLock, requestWakeLock } from './wakeLock.ts';

describe('wakeLock', () => {
  it('no-ops safely when the Wake Lock API is unavailable (as in this test environment)', async () => {
    await expect(requestWakeLock()).resolves.toBeUndefined();
    expect(() => releaseWakeLock()).not.toThrow();
  });
});
