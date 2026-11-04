import { closeSession } from '../closeSession.ts';
import { escapeHtml } from '../escape.ts';
import { onLanguageChange, t } from '../i18n/index.ts';
import { displayName } from '../members.ts';
import { gamesPlayedThisSession } from '../stats.ts';
import { exportJson, ImportError, importJson } from '../storage.ts';
import { getData, onDataChange, updateData } from '../store.ts';

export function renderStats(root: HTMLElement): () => void {
  let confirmingClose = false;
  let importErrorVisible = false;

  function render(): void {
    const data = getData();
    const session = data.currentSession;
    const gamesPlayed = session ? gamesPlayedThisSession(session) : new Map<string, number>();
    const rosterById = new Map(data.roster.map((m) => [m.id, m]));

    const gamesRows = [...gamesPlayed.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => {
        const member = rosterById.get(id);
        const name = member ? escapeHtml(displayName(member)) : id;
        return `<li>${name} – ${escapeHtml(t('stats_games_count', n))}</li>`;
      })
      .join('');

    const historyRows = [...data.history]
      .slice()
      .reverse()
      .map((h) => `<li>${escapeHtml(h.date)}: ${escapeHtml(t('stats_history_players_count', h.players))} (${h.courts} courts, ${h.rounds} rounds)</li>`)
      .join('');

    root.innerHTML = `
      <section>
        <h3>${t('stats_games_played_heading')}</h3>
        <ul>${gamesRows || `<li>${t('stats_no_players')}</li>`}</ul>
      </section>

      <section>
        <h3>${t('stats_history_heading')}</h3>
        <ul>${historyRows || `<li>${t('stats_no_history')}</li>`}</ul>
      </section>

      <section class="backup-section">
        <p class="backup-reminder">${t('stats_backup_reminder')}</p>
        <button type="button" class="export-button">${t('stats_export_button')}</button>
        <label class="import-label">
          ${t('stats_import_button')}
          <input type="file" accept="application/json" class="import-input" hidden />
        </label>
        ${importErrorVisible ? `<p class="field-error">${t('stats_import_error')}</p>` : ''}
      </section>

      <section class="close-session-section">
        ${
          !session
            ? ''
            : confirmingClose
              ? `
                <p>${t('stats_close_confirm_message')}</p>
                <button type="button" class="close-confirm-button">${t('stats_close_confirm_button')}</button>
                <button type="button" class="close-cancel-button">${t('stats_close_cancel_button')}</button>
              `
              : `<button type="button" class="close-session-button">${t('stats_close_session_button')}</button>`
        }
      </section>
    `;

    root.querySelector('.export-button')?.addEventListener('click', () => {
      const json = exportJson(getData());
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hussel-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    const importInput = root.querySelector('.import-input') as HTMLInputElement;
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        try {
          const imported = importJson(text);
          updateData((d) => {
            d.version = imported.version;
            d.roster = imported.roster;
            d.defaults = imported.defaults;
            d.history = imported.history;
            d.currentSession = imported.currentSession;
          });
          importErrorVisible = false;
        } catch (err) {
          importErrorVisible = err instanceof ImportError;
          render();
        }
      });
    });

    root.querySelector('.close-session-button')?.addEventListener('click', () => {
      confirmingClose = true;
      render();
    });
    root.querySelector('.close-cancel-button')?.addEventListener('click', () => {
      confirmingClose = false;
      render();
    });
    root.querySelector('.close-confirm-button')?.addEventListener('click', () => {
      confirmingClose = false;
      updateData((d) => closeSession(d));
    });
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);

  return () => {
    unsubscribeLanguage();
    unsubscribeData();
  };
}
