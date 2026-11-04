import type { Rng } from './rng.ts';
import type { PlayerState } from './playerState.ts';

export interface SelectionResult {
  playing: PlayerState[];
  sittingOut: PlayerState[];
}

/**
 * Fairness-only selection: fewest games played first, then longest wait since last played
 * (never-played counts as the longest possible wait), then a random tiebreak. Skill level
 * never enters this decision - the beginner preference only shapes how the chosen players
 * are grouped, never who gets to play.
 */
export function selectPlayers(present: PlayerState[], roundIndex: number, slots: number, rng: Rng): SelectionResult {
  const need = slots * 4;
  if (need <= 0) {
    return { playing: [], sittingOut: [...present] };
  }

  const ranked = present
    .map((player) => ({ player, tie: rng() }))
    .sort((x, y) => {
      if (x.player.gamesPlayed !== y.player.gamesPlayed) {
        return x.player.gamesPlayed - y.player.gamesPlayed;
      }
      const waitX = roundIndex - x.player.lastPlayedRoundIndex;
      const waitY = roundIndex - y.player.lastPlayedRoundIndex;
      if (waitX !== waitY) {
        return waitY - waitX;
      }
      return x.tie - y.tie;
    })
    .map((x) => x.player);

  const takeCount = Math.min(need, ranked.length);
  return {
    playing: ranked.slice(0, takeCount),
    sittingOut: ranked.slice(takeCount),
  };
}
