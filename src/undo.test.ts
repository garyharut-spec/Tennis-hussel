import { beforeEach, describe, expect, it } from 'vitest';
import { canUndo, clearUndo, popUndoSnapshot, pushUndoSnapshot } from './undo.ts';
import type { Round } from './types.ts';

function round(index: number): Round {
  return { index, start: '19:00', games: [], sittingOut: [], locked: false };
}

describe('undo stack', () => {
  beforeEach(() => {
    clearUndo();
  });

  it('has nothing to undo initially', () => {
    expect(canUndo()).toBe(false);
    expect(popUndoSnapshot()).toBeUndefined();
  });

  it('pops the most recently pushed snapshot (LIFO)', () => {
    pushUndoSnapshot([round(0)]);
    pushUndoSnapshot([round(0), round(1)]);

    const popped = popUndoSnapshot();
    expect(popped).toHaveLength(2);
    expect(canUndo()).toBe(true);
    expect(popUndoSnapshot()).toHaveLength(1);
    expect(canUndo()).toBe(false);
  });

  it('snapshots are deep copies, immune to later mutation', () => {
    const rounds = [round(0)];
    pushUndoSnapshot(rounds);
    rounds[0]!.locked = true;

    expect(popUndoSnapshot()![0]!.locked).toBe(false);
  });
});
