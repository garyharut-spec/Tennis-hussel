import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from './app.ts';
import { setLanguage } from './i18n/index.ts';
import { reloadForTests } from './store.ts';

function mockNarrow(narrow: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: narrow,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe('renderApp', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
    mockNarrow(false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T19:10:00'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one page: header, player panel and rounds, with no tabs', () => {
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    expect(root.querySelector('h1')?.textContent).toBe('Hussel');
    expect(root.querySelectorAll('[data-tab]')).toHaveLength(0);
    expect(root.querySelector('form.add-player')).not.toBeNull();
    expect(root.querySelector('.rounds-toolbar')).not.toBeNull();
    cleanup();
  });

  it('opens and closes settings from the cog', () => {
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(true);
    (root.querySelector('.cog-button') as HTMLButtonElement).click();
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(false);
    expect(root.querySelector('.overlay .court-tile')).not.toBeNull();
    (root.querySelector('.overlay .done-button') as HTMLButtonElement).click();
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(true);
    expect(root.querySelector('.overlay .court-tile')).toBeNull();
    cleanup();
  });

  it('opens the menu from the hamburger', () => {
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    (root.querySelector('.menu-toggle') as HTMLButtonElement).click();
    expect(root.querySelector('.overlay .menu')).not.toBeNull();
    (root.querySelector('.overlay .menu-close') as HTMLButtonElement).click();
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(true);
    cleanup();
  });

  it('switches language in place and keeps an open overlay', () => {
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    (root.querySelector('.cog-button') as HTMLButtonElement).click();
    (root.querySelector('[data-lang="nl"]') as HTMLButtonElement).click();
    expect(document.documentElement.lang).toBe('nl');
    expect(localStorage.getItem('hussel:language')).toBe('nl');
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(false);
    expect(root.querySelector('.overlay .court-count')?.textContent).toBe('4 banen');
    expect(root.querySelector('[data-lang="nl"]')?.classList.contains('active')).toBe(true);
    cleanup();
  });

  it('shows a countdown to the next changeover while a round is running', () => {
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    expect(root.querySelector('.countdown')?.textContent).toBe('Next changeover: 20:00');
    vi.advanceTimersByTime(1000);
    expect(root.querySelector('.countdown')?.textContent).toBe('Next changeover: 19:59');
    cleanup();
  });

  it('on a narrow screen the menu opens the player list and back returns to the rounds', () => {
    mockNarrow(true);
    const root = document.createElement('div');
    const cleanup = renderApp(root);
    const layout = root.querySelector('.layout') as HTMLElement;
    expect(layout.dataset['mobileView']).toBe('rounds');
    (root.querySelector('.menu-toggle') as HTMLButtonElement).click();
    (root.querySelector('.overlay .menu-players') as HTMLButtonElement).click();
    expect(layout.dataset['mobileView']).toBe('players');
    expect((root.querySelector('.overlay') as HTMLElement).hidden).toBe(true);
    (root.querySelector('.back-button') as HTMLButtonElement).click();
    expect(layout.dataset['mobileView']).toBe('rounds');
    cleanup();
  });
});
