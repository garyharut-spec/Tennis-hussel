import type { Session } from './types.ts';

export function gamesPlayedThisSession(session: Session): Map<string, number> {
  const counts = new Map<string, number>();
  for (const round of session.rounds) {
    for (const game of round.games) {
      for (const id of [...game.teamA, ...game.teamB]) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}
