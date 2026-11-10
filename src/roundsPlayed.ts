import type { Session } from './types.ts';

function playedIn(round: Session['rounds'][number], playerId: string): boolean {
  return round.games.some((g) => g.teamA.includes(playerId) || g.teamB.includes(playerId));
}

/** Rounds the player plays strictly before `roundIndex`: the count shown on their card in that round. */
export function roundsPlayedBefore(session: Session, playerId: string, roundIndex: number): number {
  return session.rounds.filter((r) => r.index < roundIndex && playedIn(r, playerId)).length;
}

export function roundsPlayedByPlayer(session: Session): Map<string, number> {
  const counts = new Map<string, number>();
  for (const round of session.rounds) {
    for (const game of round.games) {
      for (const id of [...game.teamA, ...game.teamB]) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}
