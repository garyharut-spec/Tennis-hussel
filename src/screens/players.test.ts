import { beforeEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n/index.ts';
import { getData, reloadForTests } from '../store.ts';
import { renderPlayers } from './players.ts';

function fireChange(el: Element): void {
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function addPlayer(root: HTMLElement, name: string, level: string): void {
  const nameInput = root.querySelector('[name="name"]') as HTMLInputElement;
  const levelInput = root.querySelector('[name="level"]') as HTMLInputElement;
  nameInput.value = name;
  levelInput.value = level;
  const form = root.querySelector('.quick-add') as HTMLFormElement;
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('renderPlayers', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
  });

  it('shows the empty state with no roster', () => {
    const root = document.createElement('div');
    renderPlayers(root);
    expect(root.querySelector('.empty-state')?.textContent).toBe('No players yet');
  });

  it('adds a player on submit and clears the inputs', () => {
    const root = document.createElement('div');
    renderPlayers(root);

    addPlayer(root, 'Anna', '4.5');

    expect(getData().roster).toHaveLength(1);
    expect(getData().roster[0]).toMatchObject({ firstName: 'Anna', level: 4.5 });
  });

  it('rejects an invalid level and leaves the roster untouched', () => {
    const root = document.createElement('div');
    renderPlayers(root);

    addPlayer(root, 'Anna', '99');

    expect(getData().roster).toHaveLength(0);
    expect(root.querySelector('[data-error="add"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('marks a beginner above the threshold', () => {
    const root = document.createElement('div');
    renderPlayers(root);

    addPlayer(root, 'Bram', '8.5');

    expect(root.querySelector('.beginner-tag')?.textContent).toBe('Beginner');
  });

  it('prompts for last initials on a duplicate first name, then adds both', () => {
    const root = document.createElement('div');
    renderPlayers(root);

    addPlayer(root, 'Anna', '4.5');
    addPlayer(root, 'Anna', '6.0');

    expect(root.querySelector('.duplicate-prompt')?.hasAttribute('hidden')).toBe(false);

    const newInitial = root.querySelector('[name="newInitial"]') as HTMLInputElement;
    const existingInitial = root.querySelector('[name="existingInitial"]') as HTMLInputElement;
    newInitial.value = 'M';
    existingInitial.value = 'K';
    (root.querySelector('[data-action="confirm"]') as HTMLButtonElement).click();

    const roster = getData().roster;
    expect(roster).toHaveLength(2);
    expect(roster.find((m) => m.level === 4.5)?.lastInitial).toBe('K');
    expect(roster.find((m) => m.level === 6.0)?.lastInitial).toBe('M');
  });

  it('toggles present and updates the present count', () => {
    const root = document.createElement('div');
    renderPlayers(root);
    addPlayer(root, 'Anna', '4.5');

    const checkbox = root.querySelector('.present-checkbox') as HTMLInputElement;
    checkbox.checked = true;
    fireChange(checkbox);

    expect(root.querySelector('.present-count')?.textContent).toBe('1 present');
  });

  it('edits a level inline', () => {
    const root = document.createElement('div');
    renderPlayers(root);
    addPlayer(root, 'Anna', '4.5');

    const levelInput = root.querySelector('.level-input') as HTMLInputElement;
    levelInput.value = '5.0';
    fireChange(levelInput);

    expect(getData().roster[0]?.level).toBe(5.0);
  });

  it('deletes a player', () => {
    const root = document.createElement('div');
    renderPlayers(root);
    addPlayer(root, 'Anna', '4.5');

    (root.querySelector('.delete-button') as HTMLButtonElement).click();

    expect(getData().roster).toHaveLength(0);
  });

  it('sorts by level', () => {
    const root = document.createElement('div');
    renderPlayers(root);
    addPlayer(root, 'Zed', '2.0');
    addPlayer(root, 'Amy', '7.0');

    const sortSelect = root.querySelector('select[name="sort"]') as HTMLSelectElement;
    sortSelect.value = 'level';
    fireChange(sortSelect);

    const names = [...root.querySelectorAll('.roster-name')].map((el) => el.textContent);
    expect(names[0]).toBe('Zed');
  });
});
