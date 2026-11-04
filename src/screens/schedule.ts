import { escapeHtml } from '../escape.ts';
import { onLanguageChange, t } from '../i18n/index.ts';
import { needsReplan, regenerateFrom, setRoundLocked, setRoundNotes } from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import { swapPlayers } from '../manualEdit.ts';
import { canUndo, popUndoSnapshot, pushUndoSnapshot } from '../undo.ts';
import { renderRoundGrid } from './roundView.ts';

export function renderSchedule(root: HTMLElement): () => void {
  let selectedRoundIndex = 0;

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const rounds = session.rounds;
    if (rounds.length > 0 && !rounds.some((r) => r.index === selectedRoundIndex)) {
      selectedRoundIndex = rounds[0]!.index;
    }
    const round = rounds.find((r) => r.index === selectedRoundIndex);

    root.innerHTML = `
      <div class="schedule-toolbar">
        <label>
          ${t('schedule_round_select_label')}
          <select name="round">
            ${rounds.map((r) => `<option value="${r.index}"${r.index === selectedRoundIndex ? ' selected' : ''}>${t('round_heading', r.index + 1)}</option>`).join('')}
          </select>
        </label>
        <button type="button" class="lock-button">${round?.locked ? t('schedule_unlock_button') : t('schedule_lock_button')}</button>
        <button type="button" class="regenerate-button">${t('schedule_regenerate_button')}</button>
        <button type="button" class="undo-button" ${canUndo() ? '' : 'disabled'}>${t('schedule_undo_button')}</button>
      </div>
      ${needsReplan(data, session, selectedRoundIndex) ? `<p class="replan-banner">${t('schedule_replan_banner')} <button type="button" class="replan-button">${t('schedule_replan_button')}</button></p>` : ''}
      ${round?.locked ? `<p class="locked-notice">${t('schedule_locked_notice')}</p>` : `<p class="swap-hint">${t('schedule_swap_hint')}</p>`}
      <div class="round-container"></div>
      ${!round ? `<p class="empty-grid">${t('schedule_empty_grid')}</p>` : ''}
      ${
        round
          ? `<label class="notes-field">${t('schedule_notes_placeholder')}<textarea name="notes">${escapeHtml(round.notes ?? '')}</textarea></label>`
          : ''
      }
    `;

    const roundSelect = root.querySelector('select[name="round"]') as HTMLSelectElement;
    roundSelect.addEventListener('change', () => {
      selectedRoundIndex = Number(roundSelect.value);
      render();
    });

    root.querySelector('.lock-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        const r = s.rounds.find((rr) => rr.index === selectedRoundIndex);
        if (r) setRoundLocked(s, selectedRoundIndex, !r.locked);
      });
    });

    root.querySelector('.regenerate-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        pushUndoSnapshot(s.rounds);
        regenerateFrom(d, s, selectedRoundIndex);
      });
    });

    root.querySelector('.replan-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        pushUndoSnapshot(s.rounds);
        regenerateFrom(d, s, selectedRoundIndex);
      });
    });

    root.querySelector('.undo-button')?.addEventListener('click', () => {
      const snapshot = popUndoSnapshot();
      if (!snapshot) return;
      updateData((d) => {
        const s = ensureSession(d);
        s.rounds = snapshot;
      });
    });

    const notesField = root.querySelector('textarea[name="notes"]') as HTMLTextAreaElement | null;
    notesField?.addEventListener('change', () => {
      updateData((d) => {
        const s = ensureSession(d);
        setRoundNotes(s, selectedRoundIndex, notesField.value);
      });
    });

    if (round) {
      const container = root.querySelector('.round-container') as HTMLElement;
      renderRoundGrid(container, round, data.roster, (playerAId, playerBId) => {
        updateData((d) => {
          const s = ensureSession(d);
          const r = s.rounds.find((rr) => rr.index === selectedRoundIndex);
          if (!r) return;
          pushUndoSnapshot(s.rounds);
          swapPlayers(r, playerAId, playerBId);
        });
      });
    }
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);

  return () => {
    unsubscribeLanguage();
    unsubscribeData();
  };
}
