import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { reloadForTests, updateData } from '../store.ts';
import { renderMenu } from './menu.ts';

describe('renderMenu', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
    document.body.classList.remove('wall-mode');
  });

  it('toggles wall mode on the body', () => {
    const root = document.createElement('div');
    const cleanup = renderMenu(root, { onClose: () => {} });
    const box = root.querySelector('.wall-toggle') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.body.classList.contains('wall-mode')).toBe(true);
    cleanup();
  });

  it('embeds stats, export/import and close session, with close session last', () => {
    updateData((d) => {
      ensureSession(d);
    });
    const root = document.createElement('div');
    const cleanup = renderMenu(root, { onClose: () => {} });
    const buttons = [...root.querySelectorAll('.menu-stats-section button')];
    expect(root.querySelector('.export-button')).not.toBeNull();
    expect(root.querySelector('.import-input')).not.toBeNull();
    expect(buttons[buttons.length - 1]).toBe(root.querySelector('.close-session-button'));
    cleanup();
  });

  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    const root = document.createElement('div');
    const cleanup = renderMenu(root, { onClose });
    (root.querySelector('.menu-close') as HTMLButtonElement).click();
    expect(onClose).toHaveBeenCalledOnce();
    cleanup();
  });
});
