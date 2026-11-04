import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { clearUndo } from '../undo.ts';
import { renderSchedule } from './schedule.ts';

function fireChange(el: Element): void {
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function addPresentMembers(n: number): void {
  updateData((d) => {
    for (let i = 0; i < n; i++) {
      d.roster.push({ id: `m${i}`, firstName: `P${i}`, level: 4.0 });
    }
    const session = ensureSession(d);
    for (const m of d.roster) setPresent(session, m.id, true);
  });
}

describe('renderSchedule', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    clearUndo();
    setLanguage('en');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T19:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a replan banner and the empty grid before anything has been generated', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    renderSchedule(root);

    expect(root.querySelector('.replan-banner')).not.toBeNull();
    expect(root.querySelector('.empty-grid')).not.toBeNull();
  });

  it('generates rounds when the replan button is clicked', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    renderSchedule(root);

    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    expect(getData().currentSession?.rounds.length).toBeGreaterThan(0);
    expect(root.querySelector('.court-card')).not.toBeNull();
  });

  it('locks a round and rejects a swap while locked', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    renderSchedule(root);
    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    (root.querySelector('.lock-button') as HTMLButtonElement).click();
    expect(getData().currentSession?.rounds[0]?.locked).toBe(true);
    expect(root.querySelector('.locked-notice')).not.toBeNull();

    const cards = root.querySelectorAll<HTMLButtonElement>('.player-card');
    const before = getData().currentSession!.rounds[0]!.games[0]!.teamA.slice();
    cards[0]!.click();
    cards[1]!.click();
    expect(getData().currentSession!.rounds[0]!.games[0]!.teamA).toEqual(before);
  });

  it('swaps two players via tap-to-swap and supports undo', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    renderSchedule(root);
    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    const round = getData().currentSession!.rounds[0]!;
    const [a, b] = round.games[0]!.teamA;

    const cardFor = (id: string) => root.querySelector<HTMLButtonElement>(`[data-player-id="${id}"]`)!;
    cardFor(a!).click();
    cardFor(b!).click();

    const afterRound = getData().currentSession!.rounds[0]!;
    expect(afterRound.games[0]!.teamA).toEqual([b, a]);

    (root.querySelector('.undo-button') as HTMLButtonElement).click();
    const undoneRound = getData().currentSession!.rounds[0]!;
    expect(undoneRound.games[0]!.teamA).toEqual([a, b]);
  });

  it('sets round notes', () => {
    addPresentMembers(4);
    const root = document.createElement('div');
    renderSchedule(root);
    (root.querySelector('.replan-button') as HTMLButtonElement).click();

    const notes = root.querySelector('textarea[name="notes"]') as HTMLTextAreaElement;
    notes.value = 'Court 2 is wet';
    fireChange(notes);

    expect(getData().currentSession?.rounds[0]?.notes).toBe('Court 2 is wet');
  });
});
