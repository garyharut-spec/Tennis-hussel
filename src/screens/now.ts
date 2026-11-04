import { onLanguageChange, t } from '../i18n/index.ts';
import { currentRoundIndex, needsReplan, regenerateFrom, timeGridFor } from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import { swapPlayers } from '../manualEdit.ts';
import { pushUndoSnapshot } from '../undo.ts';
import { renderRoundGrid } from './roundView.ts';

export function renderNow(root: HTMLElement): () => void {
  let timerHandle: ReturnType<typeof setInterval> | undefined;

  function render(): void {
    const data = getData();
    const session = ensureSession(data);
    const roundIndex = currentRoundIndex(session);
    const round = session.rounds.find((r) => r.index === roundIndex);

    root.innerHTML = `
      <div class="now-header">
        ${round ? `<span class="round-heading">${t('round_heading', round.index + 1)}</span><span class="time-remaining" data-time-remaining></span>` : ''}
        ${needsReplan(data, session, roundIndex < 0 ? 0 : roundIndex) ? `<button type="button" class="replan-button">${t('schedule_replan_button')}</button>` : ''}
      </div>
      <p class="swap-hint">${t('schedule_swap_hint')}</p>
      <div class="round-container"></div>
      ${!round ? `<p class="empty-grid">${t('schedule_empty_grid')}</p>` : ''}
    `;

    const replanButton = root.querySelector('.replan-button');
    replanButton?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        regenerateFrom(d, s, Math.max(roundIndex, 0));
      });
    });

    if (round) {
      const container = root.querySelector('.round-container') as HTMLElement;
      renderRoundGrid(container, round, data.roster, (playerAId, playerBId) => {
        updateData((d) => {
          const s = ensureSession(d);
          const r = s.rounds.find((rr) => rr.index === round.index);
          if (!r) return;
          pushUndoSnapshot(s.rounds);
          swapPlayers(r, playerAId, playerBId);
        });
      });
    }

    updateTimer();
  }

  function updateTimer(): void {
    const el = root.querySelector('[data-time-remaining]');
    if (!el) return;
    const session = ensureSession(getData());
    const grid = timeGridFor(session);
    const roundIndex = currentRoundIndex(session);
    const slot = grid.find((s) => s.index === roundIndex);
    if (!slot) {
      el.textContent = '';
      return;
    }
    const [endH, endM] = slot.end.split(':').map(Number);
    const end = new Date();
    end.setHours(endH ?? 0, endM ?? 0, 0, 0);
    const diffMs = end.getTime() - Date.now();
    const totalSeconds = Math.max(0, Math.round(diffMs / 1000));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    el.textContent = `${t('now_time_remaining_label')}: ${mm}:${ss}`;
  }

  render();
  timerHandle = setInterval(updateTimer, 1000);
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);

  return () => {
    clearInterval(timerHandle);
    unsubscribeLanguage();
    unsubscribeData();
  };
}
