import Sortable from 'sortablejs';
import { escapeHtml } from '../escape.ts';
import { explainText } from '../explain.ts';
import { getLanguage, t } from '../i18n/index.ts';
import { formatDecimal } from '../i18n/number.ts';
import { displayName } from '../members.ts';
import type { Member, Round } from '../types.ts';

function playerCardHtml(id: string, rosterById: Map<string, Member>): string {
  const member = rosterById.get(id);
  const name = member ? escapeHtml(displayName(member)) : id;
  const level = member ? formatDecimal(member.level, getLanguage()) : '';
  return `<div class="player-card" data-player-id="${id}">${name} <span class="level-badge">${level}</span></div>`;
}

function slotHtml(zoneId: string, playerId: string, rosterById: Map<string, Member>): string {
  return `<div class="slot" data-zone-id="${zoneId}">${playerCardHtml(playerId, rosterById)}</div>`;
}

function gameHtml(game: Round['games'][number], rosterById: Map<string, Member>): string {
  const explanations = (game.explanations ?? []).map((e) => `<li>${escapeHtml(explainText(e))}</li>`).join('');
  return `
    <div class="court-card">
      <div class="court-label">${game.court}</div>
      <div class="court-half">
        ${slotHtml(`court-${game.court}-A-0`, game.teamA[0], rosterById)}
        ${slotHtml(`court-${game.court}-A-1`, game.teamA[1], rosterById)}
      </div>
      <div class="court-half">
        ${slotHtml(`court-${game.court}-B-0`, game.teamB[0], rosterById)}
        ${slotHtml(`court-${game.court}-B-1`, game.teamB[1], rosterById)}
      </div>
      ${explanations ? `<ul class="explanations">${explanations}</ul>` : ''}
    </div>
  `;
}

let activeSortables: Sortable[] = [];

function destroyActiveSortables(): void {
  for (const s of activeSortables) s.destroy();
  activeSortables = [];
}

/**
 * Renders the court grid + sitting-out strip for a round, and wires both drag-and-drop
 * (SortableJS, one single-item "slot" list per position so a drop always swaps two specific
 * players) and tap-to-swap (select one card, tap another) to the same onSwap callback - per
 * PLAN.md 6a, "one function, two input methods" so dragging never bypasses locking/validation.
 */
export function renderRoundGrid(
  container: HTMLElement,
  round: Round,
  roster: Member[],
  onSwap: (playerAId: string, playerBId: string) => void,
): void {
  destroyActiveSortables();
  const rosterById = new Map(roster.map((m) => [m.id, m]));

  container.innerHTML = `
    ${round.games.length === 0 ? `<p class="no-courts-message">${t('schedule_no_courts_message')}</p>` : ''}
    <div class="court-grid">${round.games.map((g) => gameHtml(g, rosterById)).join('')}</div>
    <div class="sitting-out-strip">
      <h3>${t('now_sitting_out_label')}</h3>
      <div class="sitting-out-players">
        ${round.sittingOut.map((id, i) => slotHtml(`sitting-out-${i}`, id, rosterById)).join('')}
      </div>
    </div>
  `;

  let selectedId: string | null = null;
  container.querySelectorAll<HTMLElement>('.player-card').forEach((el) => {
    el.addEventListener('click', () => {
      const playerId = el.dataset['playerId']!;
      if (selectedId === null) {
        selectedId = playerId;
        el.classList.add('selected');
        return;
      }
      if (selectedId === playerId) {
        selectedId = null;
        el.classList.remove('selected');
        return;
      }
      const first = selectedId;
      selectedId = null;
      onSwap(first, playerId);
    });
  });

  if (round.locked) return;

  const slots = [...container.querySelectorAll<HTMLElement>('.slot')];
  for (const slotEl of slots) {
    const sortable = Sortable.create(slotEl, {
      group: 'round-players',
      animation: 150,
      onAdd: (evt: Sortable.SortableEvent) => {
        const draggedId = (evt.item as HTMLElement).dataset['playerId'];
        const destSlot = evt.to as HTMLElement;
        const occupant = [...destSlot.querySelectorAll<HTMLElement>('.player-card')].find(
          (el) => el.dataset['playerId'] !== draggedId,
        );
        const occupantId = occupant?.dataset['playerId'];
        if (draggedId && occupantId) onSwap(draggedId, occupantId);
      },
    });
    activeSortables.push(sortable);
  }
}
