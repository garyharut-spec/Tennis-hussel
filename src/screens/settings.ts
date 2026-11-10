import { courtTiles, toggleCourt } from '../courts.ts';
import { escapeHtml } from '../escape.ts';
import { getLanguage, onLanguageChange, t } from '../i18n/index.ts';
import { formatDecimal, parseDecimal } from '../i18n/number.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import type { SessionConfig } from '../types.ts';

/** The cog screen: courts for tonight (tiles), times, round length, beginner threshold. */
export function renderSettings(root: HTMLElement, onDone: () => void): () => void {
  let saveAsDefault = true;
  let addingCourt = false;
  let courtError = false;
  const extraCourts: number[] = [];

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const config = session.config;
    const language = getLanguage();
    const tiles = courtTiles(session, data.defaults, extraCourts);

    root.innerHTML = `
      <div class="settings">
        <h2 class="settings-title">${t('settings_title')}</h2>

        <div class="settings-row">
          <div class="settings-label">${t('settings_courts_label')}</div>
          <div class="court-tiles">
            ${tiles
              .map((c) => {
                const on = config.courts.includes(c);
                return `<button type="button" class="court-tile${on ? ' on' : ''}" data-court="${c}" aria-pressed="${on}">${c}</button>`;
              })
              .join('')}
            <button type="button" class="court-tile add" aria-label="${escapeHtml(t('settings_add_court_label'))}">+</button>
          </div>
          ${
            addingCourt
              ? `<div class="add-court">
                  <input type="text" name="newCourt" inputmode="numeric" placeholder="${escapeHtml(t('settings_add_court_label'))}" />
                  <button type="button" class="add-court-confirm">${t('players_confirm_button')}</button>
                </div>`
              : ''
          }
          <p class="field-error" data-error="court" ${courtError ? '' : 'hidden'}>${t('setup_courts_invalid')}</p>
          <div class="court-count">${t('settings_courts_count', config.courts.length)}</div>
          <div class="court-hint">${t('settings_courts_hint')}</div>
        </div>

        <div class="settings-row settings-two">
          <label>${t('setup_start_label')}<input type="time" name="start" value="${escapeHtml(config.start)}" /></label>
          <label>${t('setup_end_label')}<input type="time" name="end" value="${escapeHtml(config.end)}" /></label>
        </div>
        <p class="field-error" data-error="time" hidden>${t('setup_end_before_start')}</p>

        <div class="settings-row settings-two">
          <label>${t('settings_round_minutes_label')}<input type="number" name="gameMinutes" min="1" step="1" value="${config.gameMinutes}" /></label>
          <label>${t('setup_beginner_threshold_label')}<input type="text" name="beginnerThreshold" inputmode="decimal" value="${formatDecimal(config.beginnerThreshold, language)}" /></label>
        </div>

        <label class="save-default">
          <input type="checkbox" name="saveAsDefault" ${saveAsDefault ? 'checked' : ''} />
          ${t('setup_save_default_label')}
        </label>

        <button type="button" class="done-button">${t('settings_done_button')}</button>
      </div>`;

    const input = (name: string) => root.querySelector(`[name="${name}"]`) as HTMLInputElement;
    const timeError = root.querySelector('[data-error="time"]') as HTMLElement;

    function commit(apply: (c: SessionConfig) => void): void {
      updateData((d) => {
        const s = ensureSession(d);
        apply(s.config);
        if (saveAsDefault) d.defaults = { ...s.config };
      });
    }

    root.querySelectorAll<HTMLButtonElement>('.court-tile:not(.add)').forEach((btn) => {
      btn.addEventListener('click', () => {
        const court = Number(btn.dataset['court']);
        courtError = false;
        commit((c) => {
          c.courts = toggleCourt(c.courts, court);
        });
      });
    });

    root.querySelector('.court-tile.add')!.addEventListener('click', () => {
      addingCourt = !addingCourt;
      render();
    });

    root.querySelector('.add-court-confirm')?.addEventListener('click', () => {
      const text = (root.querySelector('[name="newCourt"]') as HTMLInputElement).value.trim();
      const known = courtTiles(ensureSession(getData()), getData().defaults, extraCourts);
      if (!/^\d{1,3}$/.test(text) || Number(text) < 1 || known.includes(Number(text))) {
        courtError = true;
        (root.querySelector('[data-error="court"]') as HTMLElement).hidden = false;
        return;
      }
      courtError = false;
      addingCourt = false;
      const court = Number(text);
      extraCourts.push(court);
      commit((c) => {
        c.courts = toggleCourt(c.courts, court);
      });
    });

    function commitTimes(): void {
      const valid = input('start').value < input('end').value;
      timeError.hidden = valid;
      if (!valid) return;
      commit((c) => {
        c.start = input('start').value;
        c.end = input('end').value;
      });
    }
    input('start').addEventListener('change', commitTimes);
    input('end').addEventListener('change', commitTimes);

    input('gameMinutes').addEventListener('change', () => {
      const minutes = Number(input('gameMinutes').value);
      if (!Number.isFinite(minutes) || minutes < 1) return;
      commit((c) => {
        c.gameMinutes = minutes;
      });
    });

    input('beginnerThreshold').addEventListener('change', () => {
      const value = parseDecimal(input('beginnerThreshold').value);
      if (value === null) return;
      commit((c) => {
        c.beginnerThreshold = value;
      });
    });

    input('saveAsDefault').addEventListener('change', () => {
      saveAsDefault = input('saveAsDefault').checked;
      if (saveAsDefault) {
        updateData((d) => {
          d.defaults = { ...ensureSession(d).config };
        });
      }
    });

    root.querySelector('.done-button')!.addEventListener('click', onDone);
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);
  return () => {
    unsubscribeLanguage();
    unsubscribeData();
  };
}
