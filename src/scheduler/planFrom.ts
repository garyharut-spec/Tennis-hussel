import type { Rng } from './rng.ts';
import { foldRoundIntoStats, type PlayerState } from './playerState.ts';
import { scheduleRound } from './scheduleRound.ts';
import type { GameAssignment } from './pairing.ts';
import type { TimeSlot } from './timeGrid.ts';

export interface RoundLike {
  index: number;
  start: string;
  games: GameAssignment[];
  sittingOut: string[];
  locked: boolean;
}

export interface BasicPlayer {
  id: string;
  level: number;
}

export interface PlanFromInput {
  roundIndex: number;
  timeGrid: TimeSlot[];
  existingRounds: RoundLike[];
  /** Everyone currently marked present; late arrivals/leavers are handled simply by what this list contains. */
  presentPlayers: BasicPlayer[];
  defaultCourts: number[];
  courtsForRound?: (roundIndex: number) => number[];
  beginnerThreshold: number;
  rng: Rng;
}

/**
 * Regenerates every round from roundIndex onward (skipping any that are locked), while
 * leaving every earlier round and every locked round untouched. Stats (games played, wait,
 * partner/opponent history) are derived purely from the preserved rounds, so a player who
 * left simply disappears from presentPlayers and a late arrival starts at zero games.
 */
export function planFrom(input: PlanFromInput): RoundLike[] {
  const kept = input.existingRounds.filter((r) => r.index < input.roundIndex);
  const lockedFuture = new Map(input.existingRounds.filter((r) => r.index >= input.roundIndex && r.locked).map((r) => [r.index, r]));

  const stats = new Map<string, PlayerState>(
    input.presentPlayers.map((p) => [p.id, { id: p.id, level: p.level, gamesPlayed: 0, lastPlayedRoundIndex: -1 }]),
  );
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  for (const round of kept) {
    foldRoundIntoStats(stats, partnerCounts, opponentCounts, round, round.index);
  }

  const result: RoundLike[] = [...kept];

  for (const slot of input.timeGrid) {
    if (slot.index < input.roundIndex) continue;

    const locked = lockedFuture.get(slot.index);
    if (locked) {
      result.push(locked);
      foldRoundIntoStats(stats, partnerCounts, opponentCounts, locked, slot.index);
      continue;
    }

    const courts = input.courtsForRound ? input.courtsForRound(slot.index) : input.defaultCourts;
    const roundResult = scheduleRound({
      roundIndex: slot.index,
      presentPlayers: [...stats.values()],
      courts,
      beginnerThreshold: input.beginnerThreshold,
      partnerCounts,
      opponentCounts,
      rng: input.rng,
    });

    const round: RoundLike = {
      index: slot.index,
      start: slot.start,
      games: roundResult.games,
      sittingOut: roundResult.sittingOut,
      locked: false,
    };
    result.push(round);
    foldRoundIntoStats(stats, partnerCounts, opponentCounts, roundResult, slot.index);
  }

  return result.sort((a, b) => a.index - b.index);
}
