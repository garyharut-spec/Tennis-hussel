import Sortable from 'sortablejs';
import { escapeHtml } from '../escape.ts';
import { explainText } from '../explain.ts';
import { onLanguageChange, t } from '../i18n/index.ts';
import { swapPlayers } from '../manualEdit.ts';
import { roundsPlayedBefore } from '../roundsPlayed.ts';
import {
  currentRoundIndex,
  firstReplanIndex,
  needsReplan,
  regenerateFrom,
  roundStatus,
  setRoundLocked,
  timeGridFor,
  type RoundStatus,
} from '../schedule.ts';
import { ensureSession } from '../session.ts';
import { getData, onDataChange, updateData } from '../store.ts';
import { canUndo, popUndoSnapshot, pushUndoSnapshot } from '../undo.ts';
import { playerCardHtml } from '../ui/playerCard.ts';
import type { Member, Round, Session } from '../types.ts';

function slotHtml(zone: string, playerId: string, roster: Map<string, Member>, session: Session, roundIndex: number): string {
  const card = playerCardHtml(playerId, roster.get(playerId), roundsPlayedBefore(session, playerId, roundIndex));
  return `<div class="slot" data-zone-id="${zone}">${card}</div>`;
}

function courtHtml(game: Round['games'][number], round: Round, roster: Map<string, Member>, session: Session): string {
  const slot = (team: 'A' | 'B', pos: 0 | 1) =>
    slotHtml(`${round.index}-${game.court}-${team}-${pos}`, (team === 'A' ? game.teamA : game.teamB)[pos], roster, session, round.index);
  const explanations = (game.explanations ?? []).map((e) => `<li>${escapeHtml(explainText(e))}</li>`).join('');
  return `
    <div class="court-card">
      <div class="court-label">${escapeHtml(t('court_label', game.court))}</div>
      <div class="court-sides">
        <div class="court-half">${slot('A', 0)}${slot('A', 1)}</div>
        <div class="net"></div>
        <div class="court-half">${slot('B', 0)}${slot('B', 1)}</div>
      </div>
      ${explanations ? `<ul class="explanations">${explanations}</ul>` : ''}
    </div>`;
}

function roundHtml(round: Round, status: RoundStatus, roster: Map<string, Member>, session: Session): string {
  const tag = status === 'now' ? t('round_tag_now') : status === 'next' ? t('round_tag_next') : '';
  const resting = round.sittingOut.map((id, i) => slotHtml(`${round.index}-rest-${i}`, id, roster, session, round.index)).join('');
  return `
    <section class="round" data-round-index="${round.index}" data-status="${status}">
      <div class="round-heading"><h2 class="round-time">${escapeHtml(round.start)}</h2>${tag ? `<span class="round-tag">${escapeHtml(tag)}</span>` : ''}</div>
      ${round.locked ? `<p class="locked-notice">${t('schedule_locked_notice')}</p>` : ''}
      ${round.games.length === 0 ? `<p class="no-courts-message">${t('schedule_no_courts_message')}</p>` : ''}
      <div class="court-grid">${round.games.map((g) => courtHtml(g, round, roster, session)).join('')}</div>
      <div class="resting">
        <h3>${t('round_resting_label')}</h3>
        <div class="resting-players">${resting || `<span class="resting-empty">${t('round_resting_empty')}</span>`}</div>
      </div>
    </section>`;
}

/**
 * The main page: every round of the evening, each with its courts and a "resting this round"
 * list. Rounds that have started (or are locked) are read-only; upcoming rounds support both
 * tap-to-swap and SortableJS drag-and-drop, which share one swap path (PLAN.md 6a).
 */
export function renderRounds(root: HTMLElement): () => void {
  let sortables: Sortable[] = [];
  let scrolledToCurrent = false;

  function destroySortables(): void {
    for (const s of sortables) s.destroy();
    sortables = [];
  }

  function swap(roundIndex: number, a: string, b: string): void {
    updateData((d) => {
      const s = ensureSession(d);
      const r = s.rounds.find((rr) => rr.index === roundIndex);
      if (!r) return;
      pushUndoSnapshot(s.rounds);
      swapPlayers(r, a, b);
    });
  }

  function replanIndexFor(session: Session): number {
    return session.rounds.length === 0 ? Math.max(currentRoundIndex(session), 0) : firstReplanIndex(session);
  }

  function render(): void {
    destroySortables();
    const scrollY = window.scrollY;
    const data = getData();
    const session = ensureSession(data);
    const roster = new Map(data.roster.map((m) => [m.id, m]));
    const now = new Date();
    const gridLength = timeGridFor(session).length;
    const upcoming = firstReplanIndex(session, now);
    const upcomingRound = session.rounds.find((r) => r.index === upcoming);
    const replanNeeded = session.rounds.length === 0 ? gridLength > 0 : upcoming < gridLength && needsReplan(data, session, upcoming);

    root.innerHTML = `
      <div class="rounds-toolbar">
        <button type="button" class="lock-button" ${upcomingRound ? '' : 'disabled'}>${upcomingRound?.locked ? t('schedule_unlock_button') : t('schedule_lock_button')}</button>
        <button type="button" class="regenerate-button" ${upcomingRound ? '' : 'disabled'}>${t('schedule_regenerate_button')}</button>
        <button type="button" class="undo-button" ${canUndo() ? '' : 'disabled'}>${t('schedule_undo_button')}</button>
      </div>
      ${
        replanNeeded
          ? `<p class="replan-banner">${session.rounds.length === 0 ? t('schedule_generate_banner') : t('schedule_replan_banner')} <button type="button" class="replan-button">${session.rounds.length === 0 ? t('schedule_generate_button') : t('schedule_replan_button')}</button></p>`
          : ''
      }
      ${session.rounds.length === 0 ? `<p class="empty-grid">${t('schedule_empty_grid')}</p>` : `<p class="swap-hint">${t('schedule_swap_hint')}</p>`}
      <div class="rounds">
        ${session.rounds.map((r) => roundHtml(r, roundStatus(session, r.index, now), roster, session)).join('')}
      </div>`;

    root.querySelector('.replan-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        pushUndoSnapshot(s.rounds);
        regenerateFrom(d, s, replanIndexFor(s));
      });
    });
    root.querySelector('.regenerate-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        pushUndoSnapshot(s.rounds);
        regenerateFrom(d, s, replanIndexFor(s));
      });
    });
    root.querySelector('.lock-button')?.addEventListener('click', () => {
      updateData((d) => {
        const s = ensureSession(d);
        const r = s.rounds.find((rr) => rr.index === firstReplanIndex(s));
        if (r) setRoundLocked(s, r.index, !r.locked);
      });
    });
    root.querySelector('.undo-button')?.addEventListener('click', () => {
      const snapshot = popUndoSnapshot();
      if (!snapshot) return;
      updateData((d) => {
        ensureSession(d).rounds = snapshot;
      });
    });

    let selected: { round: number; id: string; el: HTMLElement } | null = null;
    for (const section of root.querySelectorAll<HTMLElement>('.round')) {
      const roundIndex = Number(section.dataset['roundIndex']);
      const round = session.rounds.find((r) => r.index === roundIndex)!;
      const status = section.dataset['status'] as RoundStatus;
      if (round.locked || status === 'past' || status === 'now') continue;

      section.querySelectorAll<HTMLElement>('.player-card').forEach((el) => {
        el.addEventListener('click', () => {
          const id = el.dataset['playerId']!;
          if (!selected || selected.round !== roundIndex) {
            selected?.el.classList.remove('selected');
            selected = { round: roundIndex, id, el };
            el.classList.add('selected');
            return;
          }
          if (selected.id === id) {
            el.classList.remove('selected');
            selected = null;
            return;
          }
          const first = selected.id;
          selected = null;
          swap(roundIndex, first, id);
        });
      });

      section.querySelectorAll<HTMLElement>('.slot').forEach((slotEl) => {
        sortables.push(
          Sortable.create(slotEl, {
            group: `round-${roundIndex}`,
            animation: 150,
            onAdd: (evt: Sortable.SortableEvent) => {
              const draggedId = (evt.item as HTMLElement).dataset['playerId'];
              const occupant = [...(evt.to as HTMLElement).querySelectorAll<HTMLElement>('.player-card')].find(
                (el) => el.dataset['playerId'] !== draggedId,
              );
              const occupantId = occupant?.dataset['playerId'];
              if (draggedId && occupantId) swap(roundIndex, draggedId, occupantId);
            },
          }),
        );
      });
    }

    if (!scrolledToCurrent && session.rounds.length > 0) {
      scrolledToCurrent = true;
      const target = root.querySelector<HTMLElement>('.round[data-status="now"]') ?? root.querySelector<HTMLElement>('.round[data-status="next"]');
      target?.scrollIntoView?.({ block: 'start' });
    } else if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }

  render();
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(render);
  return () => {
    destroySortables();
    unsubscribeLanguage();
    unsubscribeData();
  };
}
