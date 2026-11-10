import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isPresent, setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { regenerateFrom } from '../schedule.ts';
import { renderPlayerPanel } from './playerPanel.ts';

function addRoster(...members: Array<[string, string, number]>): void {
  updateData((d) => {
    for (const [id, firstName, level] of members) d.roster.push({ id, firstName, level });
  });
}

function submit(root: HTMLElement, name: string, level = ''): void {
  const nameInput = root.querySelector('[name="name"]') as HTMLInputElement;
  const levelInput = root.querySelector('[name="level"]') as HTMLInputElement;
  nameInput.value = name;
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  levelInput.value = level;
  (root.querySelector('form.add-player') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function focusName(root: HTMLElement): HTMLInputElement {
  const input = root.querySelector('[name="name"]') as HTMLInputElement;
  input.dispatchEvent(new Event('focus'));
  return input;
}

const suggestionNames = (root: HTMLElement) => [...root.querySelectorAll('.suggest-name')].map((e) => e.textContent);

const names = (root: HTMLElement) => [...root.querySelectorAll('.player-row .player-name')].map((e) => e.textContent);

describe('renderPlayerPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
  });

  it('adds a saved player as present', () => {
    addRoster(['a', 'Anna', 4.5]);
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    submit(root, 'Anna');
    expect(isPresent(getData().currentSession!, 'a')).toBe(true);
    expect(names(root)).toEqual(['Anna']);
    expect(root.querySelector('.present-heading')?.textContent).toBe('Present (1)');
    cleanup();
  });

  it('creates a new player with a level and marks them present', () => {
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    submit(root, 'Zed', '6,5');
    const zed = getData().roster.find((m) => m.firstName === 'Zed')!;
    expect(zed.level).toBe(6.5);
    expect(isPresent(getData().currentSession!, zed.id)).toBe(true);
    cleanup();
  });

  it('gives a new player level 9 when no level is typed', () => {
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    submit(root, 'Zed', '');
    expect(getData().roster).toHaveLength(1);
    expect(getData().roster[0]!.level).toBe(9);
    expect(isPresent(getData().currentSession!, getData().roster[0]!.id)).toBe(true);
    cleanup();
  });

  it('still rejects a level that is typed but invalid', () => {
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    submit(root, 'Zed', 'abc');
    expect(getData().roster).toHaveLength(0);
    expect((root.querySelector('.field-error') as HTMLElement).hidden).toBe(false);
    cleanup();
  });

  it('keeps the focus in the name field after adding a new or a saved player', () => {
    addRoster(['a', 'Anna', 4.5]);
    const root = document.createElement('div');
    document.body.append(root);
    const cleanup = renderPlayerPanel(root);
    submit(root, 'Zed');
    expect(document.activeElement).toBe(root.querySelector('[name="name"]'));
    (document.activeElement as HTMLElement).blur();
    submit(root, 'Anna');
    expect(document.activeElement).toBe(root.querySelector('[name="name"]'));
    expect((root.querySelector('[name="name"]') as HTMLInputElement).value).toBe('');
    cleanup();
    root.remove();
  });

  it('lists only non-present saved players in the dropdown, including those marked left', () => {
    addRoster(['a', 'Anna', 4], ['b', 'Bram', 5], ['c', 'Cees', 6]);
    updateData((d) => {
      const s = ensureSession(d);
      setPresent(s, 'a', true);
      setPresent(s, 'b', true);
      setPresent(s, 'b', false);
    });
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    focusName(root);
    expect(suggestionNames(root)).toEqual(['Bram', 'Cees']);
    cleanup();
  });

  it('filters suggestions while typing and adds a player when one is tapped', () => {
    addRoster(['a', 'Anna', 4], ['b', 'Bram', 5], ['c', 'Cees', 6]);
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    const nameInput = focusName(root);
    nameInput.value = 'br';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(suggestionNames(root)).toEqual(['Bram']);

    root.querySelector('.suggest-option')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(isPresent(getData().currentSession!, 'b')).toBe(true);
    expect(names(root)).toEqual(['Bram']);
    cleanup();
  });

  it('marks a player as left straight away when no round is left to choose from', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 59));
    try {
      addRoster(['a', 'Anna', 4]);
      updateData((d) => setPresent(ensureSession(d), 'a', true));
      const root = document.createElement('div');
      const cleanup = renderPlayerPanel(root);
      (root.querySelector('.mark-left-button') as HTMLButtonElement).click();
      expect(document.querySelector('.leave-dialog')).toBeNull();
      expect(names(root)).toEqual([]);
      expect(getData().roster).toHaveLength(1);
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('offers upcoming round start times and plans the leave for the chosen one', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 19, 10));
    try {
      addRoster(['a', 'Anna', 4]);
      updateData((d) => {
        const s = ensureSession(d);
        s.config.start = '19:00';
        s.config.end = '21:00';
        s.config.gameMinutes = 30;
        s.config.gapMinutes = 0;
        setPresent(s, 'a', true);
      });
      const root = document.createElement('div');
      const cleanup = renderPlayerPanel(root);
      (root.querySelector('.mark-left-button') as HTMLButtonElement).click();
      expect(document.querySelector('.leave-dialog h3')?.textContent).toBe('Mark leaving as of…');
      const times = [...document.querySelectorAll('[data-leave-time]')].map((e) => e.textContent);
      expect(times).toEqual(['19:30', '20:00', '20:30']);

      (document.querySelector('[data-leave-time="20:00"]') as HTMLButtonElement).click();
      expect(document.querySelector('.leave-dialog')).toBeNull();
      expect(getData().currentSession!.attendance[0]!.leavesAt).toBe('20:00');
      // still on the list until 20:00
      expect(names(root)).toEqual(['Anna']);
      expect(root.querySelector('.leave-note')?.textContent).toBe('leaves 20:00');
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('re-plans the rounds from the leave time as soon as a leave is marked', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 19, 10));
    try {
      updateData((d) => {
        for (let i = 0; i < 8; i++) d.roster.push({ id: `p${i}`, firstName: `P${i}`, level: 4 });
        const s = ensureSession(d);
        s.config.start = '19:00';
        s.config.end = '21:00';
        s.config.gameMinutes = 30;
        s.config.gapMinutes = 0;
        s.config.courts = [1, 2];
        for (let i = 0; i < 8; i++) setPresent(s, `p${i}`, true);
        regenerateFrom(d, s, 0);
      });
      const before = JSON.stringify(getData().currentSession!.rounds.slice(0, 2));
      const root = document.createElement('div');
      const cleanup = renderPlayerPanel(root);
      (root.querySelector('.mark-left-button[data-member-id="p0"]') as HTMLButtonElement).click();
      (document.querySelector('[data-leave-time="20:00"]') as HTMLButtonElement).click();

      const rounds = getData().currentSession!.rounds;
      const has = (r: (typeof rounds)[number]) => [...r.games.flatMap((g) => [...g.teamA, ...g.teamB]), ...r.sittingOut].includes('p0');
      expect(rounds.map(has)).toEqual([true, true, false, false]);
      expect(JSON.stringify(rounds.slice(0, 2))).toBe(before);
      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('toggles between name and level order', () => {
    addRoster(['a', 'Anna', 6], ['b', 'Bram', 3]);
    updateData((d) => {
      const s = ensureSession(d);
      setPresent(s, 'a', true);
      setPresent(s, 'b', true);
    });
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    expect(names(root)).toEqual(['Anna', 'Bram']);
    (root.querySelector('.sort-toggle') as HTMLButtonElement).click();
    expect(names(root)).toEqual(['Bram', 'Anna']);
    cleanup();
  });

  it('edits level and deletes through the cog', () => {
    addRoster(['a', 'Anna', 6]);
    updateData((d) => setPresent(ensureSession(d), 'a', true));
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    expect(root.querySelector('.level-input')).toBeNull();
    (root.querySelector('.card-cog') as HTMLButtonElement).click();

    const input = root.querySelector('.level-input') as HTMLInputElement;
    input.value = '4,5';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(getData().roster[0]!.level).toBe(4.5);

    const input2 = root.querySelector('.level-input') as HTMLInputElement;
    input2.value = 'abc';
    input2.dispatchEvent(new Event('change', { bubbles: true }));
    expect(getData().roster[0]!.level).toBe(4.5);
    expect(input2.value).toBe('4.5');

    const nameInput = root.querySelector('.name-input') as HTMLInputElement;
    nameInput.value = 'Anne B.';
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(getData().roster[0]).toMatchObject({ firstName: 'Anne', lastInitial: 'B' });
    nameInput.value = '  ';
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    expect(getData().roster[0]!.firstName).toBe('Anne');
    expect(nameInput.value).toBe('Anne B.');

    (root.querySelector('.delete-button') as HTMLButtonElement).click();
    expect(getData().roster).toHaveLength(0);
    expect(getData().currentSession!.attendance).toHaveLength(0);
    cleanup();
  });

  it('escapes names in rows and the dropdown', () => {
    addRoster(['a', '<b>x</b>', 4], ['b', '<i>y</i>', 4]);
    updateData((d) => setPresent(ensureSession(d), 'a', true));
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('i')).toBeNull();
    focusName(root);
    expect(root.querySelector('.suggest-name')?.textContent).toBe('<i>y</i>');
    cleanup();
  });
});
