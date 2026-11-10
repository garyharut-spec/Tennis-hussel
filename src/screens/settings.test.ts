import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setLanguage } from '../i18n/index.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { renderSettings } from './settings.ts';

const change = (el: Element) => el.dispatchEvent(new Event('change', { bubbles: true }));
const tiles = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.court-tile:not(.add)')];
const selected = (root: HTMLElement) => tiles(root).filter((t) => t.classList.contains('on')).map((t) => Number(t.dataset['court']));
const tile = (root: HTMLElement, n: number) => tiles(root).find((t) => t.dataset['court'] === String(n))!;

function addCourt(root: HTMLElement, text: string): void {
  if (!root.querySelector('[name="newCourt"]')) (root.querySelector('.court-tile.add') as HTMLButtonElement).click();
  (root.querySelector('[name="newCourt"]') as HTMLInputElement).value = text;
  (root.querySelector('.add-court-confirm') as HTMLButtonElement).click();
}

describe('renderSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
  });

  it('shows tiles 1-4 selected from the defaults, with a count and hint', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    expect(tiles(root).map((t) => t.textContent)).toEqual(['1', '2', '3', '4']);
    expect(selected(root)).toEqual([1, 2, 3, 4]);
    expect(root.querySelector('.court-count')?.textContent).toBe('4 courts');
    expect(root.querySelector('.court-hint')?.textContent).toBe('Starts from last session’s courts');
    cleanup();
  });

  it('toggles a court and saves it as the default by default', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    tile(root, 2).click();
    expect(getData().currentSession!.config.courts).toEqual([1, 3, 4]);
    expect(getData().defaults.courts).toEqual([1, 3, 4]);
    expect(root.querySelector('.court-count')?.textContent).toBe('3 courts');
    cleanup();
  });

  it('leaves the defaults alone when "save as default" is off', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    const box = root.querySelector('[name="saveAsDefault"]') as HTMLInputElement;
    box.checked = false;
    change(box);
    tile(root, 2).click();
    expect(getData().currentSession!.config.courts).toEqual([1, 3, 4]);
    expect(getData().defaults.courts).toEqual([1, 2, 3, 4]);
    cleanup();
  });

  it('adds a new court number, selected, and rejects bad or duplicate input', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    addCourt(root, '7');
    expect(tiles(root).map((t) => t.textContent)).toEqual(['1', '2', '3', '4', '7']);
    expect(selected(root)).toEqual([1, 2, 3, 4, 7]);

    addCourt(root, 'x');
    expect((root.querySelector('[data-error="court"]') as HTMLElement).hidden).toBe(false);
    addCourt(root, '7');
    expect((root.querySelector('[data-error="court"]') as HTMLElement).hidden).toBe(false);
    expect(getData().currentSession!.config.courts).toEqual([1, 2, 3, 4, 7]);
    cleanup();
  });

  it('works with courts that are not 1..n', () => {
    updateData((d) => {
      d.defaults.courts = [3, 7, 12];
      ensureSession(d).config.courts = [3, 7, 12];
    });
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    expect(tiles(root).map((t) => t.textContent)).toEqual(['1', '2', '3', '4', '7', '12']);
    expect(selected(root)).toEqual([3, 7, 12]);
    cleanup();
  });

  it('rejects an end time before the start time', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    const end = root.querySelector('[name="end"]') as HTMLInputElement;
    end.value = '18:00';
    change(end);
    expect((root.querySelector('[data-error="time"]') as HTMLElement).hidden).toBe(false);
    expect(getData().currentSession!.config.end).toBe('22:00');
    cleanup();
  });

  it('saves round length and a beginner threshold with a comma', () => {
    const root = document.createElement('div');
    const cleanup = renderSettings(root, () => {});
    const minutes = root.querySelector('[name="gameMinutes"]') as HTMLInputElement;
    minutes.value = '20';
    change(minutes);
    const threshold = root.querySelector('[name="beginnerThreshold"]') as HTMLInputElement;
    threshold.value = '7,5';
    change(threshold);
    expect(getData().currentSession!.config.gameMinutes).toBe(20);
    expect(getData().currentSession!.config.beginnerThreshold).toBe(7.5);
    cleanup();
  });

  it('calls onDone from the Done button', () => {
    const onDone = vi.fn();
    const root = document.createElement('div');
    const cleanup = renderSettings(root, onDone);
    (root.querySelector('.done-button') as HTMLButtonElement).click();
    expect(onDone).toHaveBeenCalledOnce();
    cleanup();
  });
});
