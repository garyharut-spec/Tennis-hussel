import { beforeEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n/index.ts';
import { getData, reloadForTests } from '../store.ts';
import { renderSetup } from './setup.ts';

function fireChange(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('renderSetup', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
  });

  it('pre-fills from defaults', () => {
    const root = document.createElement('div');
    renderSetup(root);

    expect((root.querySelector('[name="courts"]') as HTMLInputElement).value).toBe('1,2,3,4');
    expect((root.querySelector('[name="start"]') as HTMLInputElement).value).toBe('19:00');
    expect((root.querySelector('[name="end"]') as HTMLInputElement).value).toBe('22:00');
  });

  it('updates the session config and defaults when courts change (save as default is on)', () => {
    const root = document.createElement('div');
    renderSetup(root);

    const courtsInput = root.querySelector('[name="courts"]') as HTMLInputElement;
    courtsInput.value = '2,5';
    fireChange(courtsInput);

    expect(getData().currentSession?.config.courts).toEqual([2, 5]);
    expect(getData().defaults.courts).toEqual([2, 5]);
  });

  it('rejects an invalid courts list without touching the store', () => {
    const root = document.createElement('div');
    renderSetup(root);

    const courtsInput = root.querySelector('[name="courts"]') as HTMLInputElement;
    courtsInput.value = 'abc';
    fireChange(courtsInput);

    expect(root.querySelector('[data-error="courts"]')?.hasAttribute('hidden')).toBe(false);
    expect(getData().currentSession?.config.courts).toEqual([1, 2, 3, 4]);
  });

  it('rejects an end time that is not after the start time', () => {
    const root = document.createElement('div');
    renderSetup(root);

    const endInput = root.querySelector('[name="end"]') as HTMLInputElement;
    endInput.value = '18:00';
    fireChange(endInput);

    expect(root.querySelector('[data-error="time"]')?.hasAttribute('hidden')).toBe(false);
    expect(getData().currentSession?.config.end).toBe('22:00');
  });
});
