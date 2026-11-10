import Sortable from 'sortablejs';
import { escapeHtml } from '../escape.ts';
import { explainText } from '../explain.ts';
import { onLanguageChange, t } from '../i18n/index.ts';
import { movePlayerToCourt, swapPlayers } from '../manualEdit.ts';
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

function slotHtml(zone: string, playerId: string | undefined, roster: Map<string, Member>, session: Session, roundIndex: number, court?: number, team?: 'A' | 'B'): string {
  const card = playerId ? playerCardHtml(playerId, roster.get(playerId), roundsPlayedBefore(session, playerId, roundIndex)) : '';
  const dest = court === undefined ? '' : ` data-court="${court}" data-team="${team}"`;
  return `<div class="slot${playerId ? '' : ' slot-empty'}" data-zone-id="${zone}"${dest}>${card}</div>`;
}

function courtHtml(game: Round['games'][number] | number, round: Round, roster: Map<string, Member>, session: Session): string {
  const court = typeof game === 'number' ? game : game.court;
  const teams = typeof game === 'number' ? { teamA: [], teamB: [] } : game;
  const slot = (team: 'A' | 'B', pos: 0 | 1) =>
    slotHtml(`${round.index}-${court}-${team}-${pos}`, (team === 'A' ? teams.teamA : teams.teamB)[pos], roster, session, round.index, court, team);
  const explanations = (typeof game === 'number' ? [] : (game.explanations ?? []))
    .map((e) => explainText(e))
    .filter((text): text is string => text !== null)
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('');
  return `
    <div class="court-card${typeof game === 'number' ? ' empty' : ''}">
      <div class="court-label">${escapeHtml(t('court_label', court))}</div>
      <div class="court-sides">
        <div class="court-half">${slot('A', 0)}${slot('A', 1)}</div>
        <div class="net"></div>
        <div class="court-half">${slot('B', 0)}${slot('B', 1)}</div>
      </div>
      ${explanations ? `<ul class="explanations">${explanations}</ul>` : ''}
    </div>`;
}

/** Played games plus a bare court number for every configured court with no game, in court order. */
function courtsInOrder(round: Round, session: Session): (Round['games'][number] | number)[] {
  const byCourt = new Map(round.games.map((g) => [g.court, g]));
  const numbers = [...new Set([...session.config.courts, ...byCourt.keys()])].sort((a, b) => a - b);
  return numbers.map((n) => byCourt.get(n) ?? n);
}

const svg = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
const REFRESH_ICON = svg('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>');
const LOCK_ICON = svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');
const UNLOCK_ICON = svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>');

function roundHtml(round: Round, status: RoundStatus, roster: Map<string, Member>, session: Session): string {
  const tag = status === 'now' ? t('round_tag_now') : status === 'next' ? t('round_tag_next') : '';
  const resting = round.sittingOut.map((id, i) => slotHtml(`${round.index}-rest-${i}`, id, roster, session, round.index)).join('');
  return `
    <section class="round" data-round-index="${round.index}" data-status="${status}">
      <div class="round-heading"><h2 class="round-time">${escapeHtml(round.start)}</h2>${tag ? `<span class="round-tag">${escapeHtml(tag)}</span>` : ''}${
        status === 'past' || status === 'now'
          ? ''
          : `<button type="button" class="regenerate-round-button icon-button" data-round-index="${round.index}" aria-label="${escapeHtml(t('schedule_regenerate_round_button'))}" title="${escapeHtml(t('schedule_regenerate_round_button'))}" ${round.locked ? 'disabled' : ''}>${REFRESH_ICON}</button><button type="button" class="lock-button icon-button" data-round-index="${round.index}" aria-pressed="${round.locked}" aria-label="${escapeHtml(round.locked ? t('schedule_unlock_button') : t('schedule_lock_button'))}" title="${escapeHtml(round.locked ? t('schedule_unlock_button') : t('schedule_lock_button'))}">${round.locked ? LOCK_ICON : UNLOCK_ICON}</button>`
      }${round.locked ? `<span class="locked-notice">${t('schedule_locked_notice')}</span>` : ''}</div>
      ${round.games.length === 0 ? `<p class="no-courts-message">${t('schedule_no_courts_message')}</p>` : ''}
      <div class="court-grid">${courtsInOrder(round, session)
        .map((c) => courtHtml(c, round, roster, session))
        .join('')}</div>
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

  function moveToCourt(roundIndex: number, playerId: string, court: number, team: 'A' | 'B'): void {
    updateData((d) => {
      const s = ensureSession(d);
      const r = s.rounds.find((rr) => rr.index === roundIndex);
      if (!r) return;
      pushUndoSnapshot(s.rounds);
      movePlayerToCourt(r, playerId, court, team);
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
        <button type="button" class="players-button">${t('players_button_label')}</button>
        <button type="button" class="regenerate-button icon-button" aria-label="${escapeHtml(t('schedule_regenerate_button'))}" title="${escapeHtml(t('schedule_regenerate_button'))}" ${upcomingRound ? '' : 'disabled'}>${REFRESH_ICON}</button>
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

    root.querySelector('.players-button')?.addEventListener('click', () => {
      const layout = root.closest<HTMLElement>('.layout');
      if (layout) layout.dataset['mobileView'] = 'players';
    });
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
    root.querySelectorAll<HTMLButtonElement>('.regenerate-round-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset['roundIndex']);
        updateData((d) => {
          const s = ensureSession(d);
          pushUndoSnapshot(s.rounds);
          regenerateFrom(d, s, index, new Date(), true);
        });
      });
    });
    root.querySelectorAll<HTMLButtonElement>('.lock-button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset['roundIndex']);
        updateData((d) => {
          const s = ensureSession(d);
          const r = s.rounds.find((rr) => rr.index === index);
          if (r) setRoundLocked(s, r.index, !r.locked);
        });
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

      section.querySelectorAll<HTMLElement>('.slot-empty[data-court]').forEach((slotEl) => {
        slotEl.addEventListener('click', () => {
          if (!selected || selected.round !== roundIndex) return;
          const id = selected.id;
          selected = null;
          moveToCourt(roundIndex, id, Number(slotEl.dataset['court']), slotEl.dataset['team'] as 'A' | 'B');
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
              else if (draggedId) {
                // Dropped on an empty slot: move rather than swap.
                const to = evt.to as HTMLElement;
                const court = Number(to.dataset['court']);
                const team = to.dataset['team'] as 'A' | 'B' | undefined;
                if (team && !Number.isNaN(court)) moveToCourt(roundIndex, draggedId, court, team);
                else render();
              }
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

  function statusSignature(): string {
    const session = ensureSession(getData());
    const now = new Date();
    return session.rounds.map((r) => roundStatus(session, r.index, now)).join(',');
  }

  render();
  let lastSignature = statusSignature();
  // Re-render when a round starts or ends, so the "now" tag and read-only state keep up with the clock.
  const clock = setInterval(() => {
    const signature = statusSignature();
    if (signature !== lastSignature) render();
    lastSignature = signature;
  }, 15000);
  const unsubscribeLanguage = onLanguageChange(render);
  const unsubscribeData = onDataChange(() => {
    render();
    lastSignature = statusSignature();
  });
  return () => {
    clearInterval(clock);
    destroySortables();
    unsubscribeLanguage();
    unsubscribeData();
  };
}
