export interface PlayerState {
  id: string;
  level: number;
  gamesPlayed: number;
  /** -1 if the player has never played yet this session. */
  lastPlayedRoundIndex: number;
  lastCourt?: number;
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function incrementPair(counts: Map<string, number>, a: string, b: string): void {
  const key = pairKey(a, b);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export function pairCount(counts: Map<string, number>, a: string, b: string): number {
  return counts.get(pairKey(a, b)) ?? 0;
}

export interface RoundLikeForFolding {
  games: Array<{ court: number; teamA: [string, string]; teamB: [string, string] }>;
  sittingOut: string[];
}

/** Mutates stats/partnerCounts/opponentCounts to reflect one round having been played. */
export function foldRoundIntoStats(
  stats: Map<string, PlayerState>,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  round: RoundLikeForFolding,
  roundIndex: number,
): void {
  for (const game of round.games) {
    const all = [...game.teamA, ...game.teamB];
    for (const id of all) {
      const state = stats.get(id);
      if (state) {
        state.gamesPlayed += 1;
        state.lastPlayedRoundIndex = roundIndex;
        state.lastCourt = game.court;
      }
    }
    incrementPair(partnerCounts, game.teamA[0], game.teamA[1]);
    incrementPair(partnerCounts, game.teamB[0], game.teamB[1]);
    for (const a of game.teamA) {
      for (const b of game.teamB) {
        incrementPair(opponentCounts, a, b);
      }
    }
  }
}
