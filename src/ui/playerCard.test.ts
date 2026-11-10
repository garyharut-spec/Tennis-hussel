import { beforeEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n/index.ts';
import { playerCardHtml } from './playerCard.ts';

function parse(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('playerCardHtml', () => {
  beforeEach(() => {
    localStorage.clear();
    setLanguage('en');
  });

  it('shows name, level and rounds played', () => {
    const el = parse(playerCardHtml('a', { id: 'a', firstName: 'Anna', level: 4.5 }, 2));
    expect(el.querySelector('.player-card')?.getAttribute('data-player-id')).toBe('a');
    expect(el.querySelector('.player-name')?.textContent).toBe('Anna');
    expect(el.querySelector('.player-badge')?.textContent).toBe('4.5 · 2 rounds played');
  });

  it('shows 0 rounds played', () => {
    const el = parse(playerCardHtml('a', { id: 'a', firstName: 'Anna', level: 4.5 }, 0));
    expect(el.querySelector('.player-badge')?.textContent).toBe('4.5 · 0 rounds played');
  });

  it('uses a decimal comma in Dutch', () => {
    setLanguage('nl');
    const el = parse(playerCardHtml('a', { id: 'a', firstName: 'Anna', level: 4.5 }, 2));
    expect(el.querySelector('.player-badge')?.textContent).toBe('4,5 · 2 rondes gespeeld');
  });

  it('escapes names', () => {
    const el = parse(playerCardHtml('a', { id: 'a', firstName: '<b>x</b>', level: 4 }, 1));
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('.player-name')?.textContent).toBe('<b>x</b>');
  });

  it('does not crash for a player missing from the roster', () => {
    const el = parse(playerCardHtml('gone1', undefined, 3));
    expect(el.querySelector('.player-name')?.textContent).toBe('gone1');
    expect(el.querySelector('.player-badge')?.textContent).toBe('3 rounds played');
  });
});
