import { beforeEach, describe, expect, it } from 'vitest';
import { setPresent } from '../attendance.ts';
import { setLanguage } from '../i18n/index.ts';
import { regenerateFrom } from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, reloadForTests, updateData } from '../store.ts';
import { renderStats } from './stats.ts';

function addPresentMembersAndGenerate(n: number): void {
  updateData((d) => {
    for (let i = 0; i < n; i++) d.roster.push({ id: `m${i}`, firstName: `P${i}`, level: 4.0 });
    const session = ensureSession(d);
    for (const m of d.roster) setPresent(session, m.id, true);
    regenerateFrom(d, session, 0, new Date('2026-11-05T19:00:00'));
  });
}

describe('renderStats', () => {
  beforeEach(() => {
    localStorage.clear();
    reloadForTests();
    setLanguage('en');
  });

  it('shows no players / no history when empty', () => {
    const root = document.createElement('div');
    renderStats(root);
    expect(root.textContent).toContain('No players yet');
    expect(root.textContent).toContain('No past sessions yet');
  });

  it('lists games played tonight after rounds are generated', () => {
    addPresentMembersAndGenerate(4);
    const root = document.createElement('div');
    renderStats(root);
    expect(root.textContent).toMatch(/P0 .* \d+ games?/);
  });

  it('closes the session via the two-step confirm and appends to history', () => {
    addPresentMembersAndGenerate(4);
    const root = document.createElement('div');
    renderStats(root);

    (root.querySelector('.close-session-button') as HTMLButtonElement).click();
    expect(root.querySelector('.close-confirm-button')).not.toBeNull();

    (root.querySelector('.close-confirm-button') as HTMLButtonElement).click();

    expect(getData().currentSession).toBeNull();
    expect(getData().history).toHaveLength(1);
    expect(getData().history[0]).toMatchObject({ players: 4, courts: 4 });
  });

  it('cancelling the close-session confirm leaves the session intact', () => {
    addPresentMembersAndGenerate(4);
    const root = document.createElement('div');
    renderStats(root);

    (root.querySelector('.close-session-button') as HTMLButtonElement).click();
    (root.querySelector('.close-cancel-button') as HTMLButtonElement).click();

    expect(getData().currentSession).not.toBeNull();
    expect(getData().history).toHaveLength(0);
  });

  it('escapes HTML-looking data in the history list instead of injecting it', () => {
    updateData((d) => {
      d.history.push({ date: '<img src=x onerror=alert(1)>', players: 1, courts: 1, rounds: 1 });
    });
    const root = document.createElement('div');
    renderStats(root);

    expect(root.querySelector('img')).toBeNull();
    expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('exports the current data as JSON via a download link', () => {
    addPresentMembersAndGenerate(4);
    const root = document.createElement('div');
    renderStats(root);

    const clicks: string[] = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    };
    try {
      (root.querySelector('.export-button') as HTMLButtonElement).click();
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
    }
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatch(/^hussel-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
