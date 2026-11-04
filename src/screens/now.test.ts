import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { clearUndo } from '../undo.ts';
import { renderNow } from './now.ts';

function addPresentMembers(n: number): void {
  updateData((d) => {
    for (let i = 0; i < n; i++) {
      d.roster.push({ id: `m${i}`, firstName: `P${i}`, level: 4.0 });
    }
    const session = ensureSession(d);
    for (const m of d.roster) setPresent(session, m.id, true);
  });
}

describe('renderNow', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    clearUndo();
    setLanguage('en');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T19:10:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the empty-grid message and a replan button before anything is generated', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    const cleanup = renderNow(root);

    expect(root.querySelector('.empty-grid')).not.toBeNull();
    expect(root.querySelector('.replan-button')).not.toBeNull();
    cleanup();
  });

  it('shows the current round and a countdown once generated', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    const cleanup = renderNow(root);

    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    expect(root.querySelector('.court-card')).not.toBeNull();
    expect(root.querySelector('[data-time-remaining]')?.textContent).toMatch(/Time left: \d{2}:\d{2}/);
    cleanup();
  });

  it('swaps players via tap-to-swap', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    const cleanup = renderNow(root);
    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    const round = getData().currentSession!.rounds[0]!;
    const [a, b] = round.games[0]!.teamA;
    const cardFor = (id: string) => root.querySelector<HTMLButtonElement>(`[data-player-id="${id}"]`)!;
    cardFor(a!).click();
    cardFor(b!).click();

    expect(getData().currentSession!.rounds[0]!.games[0]!.teamA).toEqual([b, a]);
    cleanup();
  });
});
