import { describe, expect, it } from 'vitest';
import { renderApp, TABS } from './app.ts';

describe('renderApp', () => {
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
});
