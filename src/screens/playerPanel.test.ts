import { beforeEach, describe, expect, it } from 'vitest';
import { isPresent, setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
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
    const options = [...root.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'));
    expect(options.sort()).toEqual(['Bram', 'Cees']);
    cleanup();
  });

  it('marks a player as left but keeps them in the roster', () => {
    addRoster(['a', 'Anna', 4]);
    updateData((d) => setPresent(ensureSession(d), 'a', true));
    const root = document.createElement('div');
    const cleanup = renderPlayerPanel(root);
    (root.querySelector('.mark-left-button') as HTMLButtonElement).click();
    expect(names(root)).toEqual([]);
    expect(getData().roster).toHaveLength(1);
    cleanup();
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
    expect(root.querySelector('datalist option')?.getAttribute('value')).toBe('<i>y</i>');
    cleanup();
  });
});
