import { escapeHtml } from '../escape.ts';
import { getLanguage, t } from '../i18n/index.ts';
import { formatDecimal } from '../i18n/number.ts';
import { displayName } from '../members.ts';
import type { Member } from '../types.ts';

/** The one player card used on courts, in resting lists and in the player list. */
export function playerCardHtml(playerId: string, member: Member | undefined, roundsPlayed: number, extraHtml = ''): string {
  const name = escapeHtml(member ? displayName(member) : playerId);
  const played = t('rounds_played_count', roundsPlayed);
  const badge = member ? `${formatDecimal(member.level, getLanguage())} · ${played}` : played;
  return `<div class="player-card" data-player-id="${escapeHtml(playerId)}"><span class="player-name">${name}</span><span class="player-badge">${escapeHtml(badge)}</span>${extraHtml}</div>`;
}
