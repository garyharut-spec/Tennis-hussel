import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { roundsPlayedBefore } from '../roundsPlayed.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { clearUndo } from '../undo.ts';
import { renderRounds } from './rounds.ts';

const LEVELS = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 3.0, 4.0, 5.0, 8.0, 8.5, 9.0, 8.0, 9.0, 6.0, 7.0, 2.0];

function seed(n: number, courts: number[] = [1, 2, 3, 4]): void {
  updateData((d) => {
    for (let i = 0; i < n; i++) d.roster.push({ id: `m${i}`, firstName: `P${i}`, level: LEVELS[i % LEVELS.length]! });
    const s = ensureSession(d);
    s.config.start = '19:00';
    s.config.end = '21:00';
    s.config.courts = courts;
    for (const m of d.roster) setPresent(s, m.id, true);
  });
}

function generate(root: HTMLElement): void {
  (root.querySelector('.replan-button') as HTMLButtonElement).click();
}

describe('renderRounds', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    clearUndo();
    setLanguage('en');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T19:10:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows every round with 4 courts and a resting list', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);

    const rounds = root.querySelectorAll('.round');
    expect(rounds).toHaveLength(4);
    expect([...rounds].map((r) => r.getAttribute('data-status'))).toEqual(['now', 'next', 'future', 'future']);
    expect(rounds[0]!.querySelector('.round-time')?.textContent).toBe('19:00');
    expect(rounds[0]!.querySelector('.round-tag')?.textContent).toBe('Now');
    expect(rounds[1]!.querySelector('.round-tag')?.textContent).toBe('Next');
    for (const r of rounds) {
      expect(r.querySelectorAll('.court-card')).toHaveLength(4);
      expect(r.querySelectorAll('.resting .player-card')).toHaveLength(6);
      expect(r.querySelector('.resting h3')?.textContent).toBe('Resting this round');
    }
    cleanup();
  });

  it('shows rounds played as it will be at the start of each round', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);

    const session = getData().currentSession!;
    const id = session.rounds[2]!.games[0]!.teamA[0]!;
    const expected = roundsPlayedBefore(session, id, 2);
    const card = root.querySelector(`.round[data-round-index="2"] [data-player-id="${id}"] .player-badge`)!;
    expect(card.textContent).toMatch(new RegExp(`· ${expected} rounds? played$`));
    cleanup();
  });

  it('labels courts with their own numbers, and works with one court', () => {
    seed(8, [3, 7, 12]);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    const labels = [...root.querySelectorAll('.round[data-round-index="0"] .court-label')].map((e) => e.textContent);
    expect(labels).toEqual(['Court 3', 'Court 7', 'Court 12']);
    const empty = root.querySelectorAll('.round[data-round-index="0"] .court-card.empty');
    expect(empty).toHaveLength(1);
    expect(empty[0]!.querySelector('.court-label')?.textContent).toBe('Court 12');
    cleanup();

    localStorage.clear();
    reloadForTests();
    seed(8, [5]);
    const root2 = document.createElement('div');
    const cleanup2 = renderRounds(root2);
    generate(root2);
    expect(root2.querySelectorAll('.round[data-round-index="0"] .court-card')).toHaveLength(1);
    expect(root2.querySelector('.round[data-round-index="0"] .court-label')?.textContent).toBe('Court 5');
    cleanup2();
  });

  it('swaps by tapping in an upcoming round but not in the round that has started', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);

    const before0 = structuredClone(getData().currentSession!.rounds[0]!);
    const tap = (round: number, id: string) =>
      root.querySelector<HTMLElement>(`.round[data-round-index="${round}"] [data-player-id="${id}"]`)!.click();

    tap(0, before0.games[0]!.teamA[0]!);
    tap(0, before0.sittingOut[0]!);
    expect(getData().currentSession!.rounds[0]).toEqual(before0);

    const r2 = getData().currentSession!.rounds[2]!;
    const onCourt = r2.games[0]!.teamA[0]!;
    const resting = r2.sittingOut[0]!;
    tap(2, onCourt);
    tap(2, resting);
    const after = getData().currentSession!.rounds[2]!;
    expect(after.games[0]!.teamA[0]).toBe(resting);
    expect(after.sittingOut).toContain(onCourt);
    cleanup();
  });

  it('offers a replan for a late arrival without touching the started round', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    const round0 = structuredClone(getData().currentSession!.rounds[0]!);

    updateData((d) => {
      d.roster.push({ id: 'late', firstName: 'Late', level: 5 });
      setPresent(ensureSession(d), 'late', true);
    });
    expect(root.querySelector('.replan-banner')).not.toBeNull();

    generate(root);
    const rounds = getData().currentSession!.rounds;
    expect(rounds[0]).toEqual(round0);
    const later = rounds.slice(1).some((r) => r.games.some((g) => [...g.teamA, ...g.teamB].includes('late')) || r.sittingOut.includes('late'));
    expect(later).toBe(true);
    expect(root.querySelector('.replan-banner')).toBeNull();
    cleanup();
  });

  it('shows a message instead of courts when fewer than 2 are present', () => {
    seed(1);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    expect(root.querySelector('.no-courts-message')).not.toBeNull();
    cleanup();
  });

  it('shows a player who has since left by name in a past round, and escapes names', () => {
    seed(8);
    updateData((d) => {
      d.roster[0]!.firstName = '<b>x</b>';
    });
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    updateData((d) => setPresent(ensureSession(d), 'm1', false));
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelectorAll('.round[data-round-index="0"] .player-card').length).toBe(8);
    cleanup();
  });

  it('each upcoming round has its own lock button; undo restores after regenerate', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    expect(root.querySelectorAll('.round[data-round-index="0"] .lock-button').length).toBe(0);
    (root.querySelector('.round[data-round-index="2"] .lock-button') as HTMLButtonElement).click();
    expect(getData().currentSession!.rounds[2]!.locked).toBe(true);
    expect(getData().currentSession!.rounds[1]!.locked).toBe(false);
    expect(getData().currentSession!.rounds[0]!.locked).toBe(false);

    const before = structuredClone(getData().currentSession!.rounds);
    (root.querySelector('.regenerate-button') as HTMLButtonElement).click();
    (root.querySelector('.undo-button') as HTMLButtonElement).click();
    expect(getData().currentSession!.rounds).toEqual(before);
    cleanup();
  });

  it('regenerate-round button only changes its own round and is disabled when locked', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    const before = structuredClone(getData().currentSession!.rounds);
    (root.querySelector('.round[data-round-index="2"] .regenerate-round-button') as HTMLButtonElement).click();
    const after = getData().currentSession!.rounds;
    expect(after[1]).toEqual(before[1]);
    expect(after[3]).toEqual(before[3]);
    expect(after[0]).toEqual(before[0]);
    (root.querySelector('.round[data-round-index="2"] .lock-button') as HTMLButtonElement).click();
    expect((root.querySelector('.round[data-round-index="2"] .regenerate-round-button') as HTMLButtonElement).disabled).toBe(true);
    cleanup();
  });

  it('moves the "now" tag and locks the finished round when time passes the changeover', () => {
    seed(22);
    const root = document.createElement('div');
    const cleanup = renderRounds(root);
    generate(root);
    const statuses = () => [...root.querySelectorAll('.round')].map((r) => r.getAttribute('data-status'));
    expect(statuses()).toEqual(['now', 'next', 'future', 'future']);

    vi.advanceTimersByTime(21 * 60 * 1000); // 19:31
    expect(statuses()).toEqual(['past', 'now', 'next', 'future']);
    cleanup();
  });
});
