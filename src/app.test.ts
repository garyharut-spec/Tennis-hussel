import { beforeEach, describe, expect, it } from 'vitest';
import { renderApp, TABS } from './app.ts';
import { setLanguage } from './i18n/index.ts';

describe('renderApp', () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage('en');
  });

  it('renders the header title and one button per tab', () => {
    const root = document.createElement('div');
    renderApp(root);

    expect(root.querySelector('h1')?.textContent).toBe('Hussel');
    expect(root.querySelectorAll('[data-tab]')).toHaveLength(TABS.length);
  });

  it('switches the active tab on click', () => {
    const root = document.createElement('div');
    renderApp(root);

    const playersButton = root.querySelector<HTMLButtonElement>('[data-tab="players"]')!;
    playersButton.click();

    expect(playersButton.classList.contains('active')).toBe(true);
    expect(root.querySelector('.tab-content')?.textContent).toBe('Players');
  });

  it('switches every visible string and persists the language on NL click, keeping the active tab', () => {
    const root = document.createElement('div');
    renderApp(root);

    root.querySelector<HTMLButtonElement>('[data-tab="players"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-lang="nl"]')!.click();

    expect(document.documentElement.lang).toBe('nl');
    expect(root.querySelector('h1')?.textContent).toBe('Hussel');
    expect(root.querySelector('[data-tab="players"]')?.textContent).toBe('Spelers');
    expect(root.querySelector('[data-tab="players"]')?.classList.contains('active')).toBe(true);
    expect(root.querySelector('.tab-content')?.textContent).toBe('Spelers');
    expect(localStorage.getItem('hussel:language')).toBe('nl');
  });
});
