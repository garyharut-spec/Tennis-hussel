import { shuffle, type Rng } from './rng.ts';
import { splitIntoGames, type Explanation, type GameAssignment } from './pairing.ts';
import { selectPlayers } from './selectPlayers.ts';
import type { PlayerState } from './playerState.ts';

export interface ScheduleRoundInput {
  roundIndex: number;
  presentPlayers: PlayerState[];
  courts: number[];
  beginnerThreshold: number;
  partnerCounts: Map<string, number>;
  opponentCounts: Map<string, number>;
  rng: Rng;
}

/** A doubles game (2 v 2) or, on a spare court, a singles game (1 v 1). */
export type ScheduledGame = Omit<GameAssignment, 'teamA' | 'teamB'> & { teamA: string[]; teamB: string[] };

export interface ScheduleRoundResult {
  games: ScheduledGame[];
  sittingOut: string[];
}

export function scheduleRound(input: ScheduleRoundInput): ScheduleRoundResult {
  const slots = Math.min(input.courts.length, Math.floor(input.presentPlayers.length / 4));
  const { playing, sittingOut } = selectPlayers(input.presentPlayers, input.roundIndex, slots, input.rng);

  // Spare courts (more courts than full foursomes) let leftover players play singles rather than
  // sit out. Whoever fairness ranks next goes first; pairs are matched on closest level.
  const spareCourts = input.courts.slice(slots);
  const singlesPairs = Math.min(spareCourts.length, Math.floor(sittingOut.length / 2));
  const singlesPlayers = sittingOut.splice(0, singlesPairs * 2).sort((a, b) => a.level - b.level);
  const singles: ScheduledGame[] = [];
  for (let i = 0; i < singlesPairs; i++) {
    singles.push({
      court: spareCourts[i]!,
      teamA: [singlesPlayers[2 * i]!.id],
      teamB: [singlesPlayers[2 * i + 1]!.id],
      explanations: [{ code: 'SINGLES_GAME' } satisfies Explanation],
    });
  }

  if (playing.length === 0) {
    return { games: singles, sittingOut: sittingOut.map((p) => p.id) };
  }

  const shuffledIds = shuffle(playing, input.rng).map((p) => p.id);
  const playerMap = new Map(input.presentPlayers.map((p) => [p.id, p]));
  const courts = input.courts.slice(0, slots);

  const games = splitIntoGames(
    shuffledIds,
    courts,
    playerMap,
    input.beginnerThreshold,
    input.partnerCounts,
    input.opponentCounts,
    input.rng,
  );

  return { games: [...games, ...singles], sittingOut: sittingOut.map((p) => p.id) };
}
