import { shuffle, type Rng } from './rng.ts';
import { splitIntoGames, type GameAssignment } from './pairing.ts';
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

export interface ScheduleRoundResult {
  games: GameAssignment[];
  sittingOut: string[];
}

export function scheduleRound(input: ScheduleRoundInput): ScheduleRoundResult {
  const slots = Math.min(input.courts.length, Math.floor(input.presentPlayers.length / 4));
  const { playing, sittingOut } = selectPlayers(input.presentPlayers, input.roundIndex, slots, input.rng);

  if (playing.length === 0) {
    return { games: [], sittingOut: sittingOut.map((p) => p.id) };
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

  return { games, sittingOut: sittingOut.map((p) => p.id) };
}
