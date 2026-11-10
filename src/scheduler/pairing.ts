import { isBeginner } from '../level.ts';
import type { Rng } from './rng.ts';
import { pairCount, type PlayerState } from './playerState.ts';
import { TEAM_IMBALANCE_EXPLAIN_THRESHOLD, WEIGHTS } from './weights.ts';

export type ExplanationCode =
  | 'ODD_BEGINNERS'
  | 'BEGINNERS_SAME_TEAM'
  | 'TEAM_IMBALANCE'
  | 'REPEAT_PARTNER'
  | 'REPEAT_OPPONENT'
  | 'SAME_COURT_AS_LAST_ROUND'
  | 'SINGLES_GAME';

export interface Explanation {
  code: ExplanationCode;
  params?: Record<string, number>;
}

export interface GameAssignment {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
  explanations: Explanation[];
}

type Team = [string, string];

function teamSkillSum(players: Map<string, PlayerState>, team: Team): number {
  return players.get(team[0])!.level + players.get(team[1])!.level;
}

function beginnerCountOf(players: Map<string, PlayerState>, ids: string[], threshold: number): number {
  return ids.filter((id) => isBeginner(players.get(id)!.level, threshold)).length;
}

function teamIsAllBeginners(players: Map<string, PlayerState>, team: Team, threshold: number): boolean {
  return team.every((id) => isBeginner(players.get(id)!.level, threshold));
}

function scoreGame(
  players: Map<string, PlayerState>,
  teamA: Team,
  teamB: Team,
  court: number,
  beginnerThreshold: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
): number {
  const all = [...teamA, ...teamB];
  const beginnerCount = beginnerCountOf(players, all, beginnerThreshold);
  let score = 0;

  if (beginnerCount % 2 === 1) score += WEIGHTS.oddBeginners;
  if (beginnerCount === 4) score += WEIGHTS.fourBeginners;
  if (beginnerCount === 2) {
    if (teamIsAllBeginners(players, teamA, beginnerThreshold) || teamIsAllBeginners(players, teamB, beginnerThreshold)) {
      score += WEIGHTS.beginnersSameTeam;
    }
  }

  const diff = Math.abs(teamSkillSum(players, teamA) - teamSkillSum(players, teamB));
  score += diff * WEIGHTS.teamImbalancePerPoint;

  score += pairCount(partnerCounts, teamA[0], teamA[1]) * WEIGHTS.repeatPartner;
  score += pairCount(partnerCounts, teamB[0], teamB[1]) * WEIGHTS.repeatPartner;

  for (const a of teamA) {
    for (const b of teamB) {
      score += pairCount(opponentCounts, a, b) * WEIGHTS.repeatOpponent;
    }
  }

  for (const id of all) {
    if (players.get(id)!.lastCourt === court) score += WEIGHTS.sameCourtAsLastRound;
  }

  return score;
}

function explainGame(
  players: Map<string, PlayerState>,
  teamA: Team,
  teamB: Team,
  court: number,
  beginnerThreshold: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
): Explanation[] {
  const explanations: Explanation[] = [];
  const all = [...teamA, ...teamB];
  const beginnerCount = beginnerCountOf(players, all, beginnerThreshold);

  if (beginnerCount % 2 === 1) explanations.push({ code: 'ODD_BEGINNERS', params: { n: beginnerCount } });
  if (
    beginnerCount === 2 &&
    (teamIsAllBeginners(players, teamA, beginnerThreshold) || teamIsAllBeginners(players, teamB, beginnerThreshold))
  ) {
    explanations.push({ code: 'BEGINNERS_SAME_TEAM' });
  }

  const diff = Math.abs(teamSkillSum(players, teamA) - teamSkillSum(players, teamB));
  if (diff >= TEAM_IMBALANCE_EXPLAIN_THRESHOLD) explanations.push({ code: 'TEAM_IMBALANCE', params: { diff } });

  if (pairCount(partnerCounts, teamA[0], teamA[1]) > 0 || pairCount(partnerCounts, teamB[0], teamB[1]) > 0) {
    explanations.push({ code: 'REPEAT_PARTNER' });
  }

  let repeatOpponent = false;
  for (const a of teamA) {
    for (const b of teamB) {
      if (pairCount(opponentCounts, a, b) > 0) repeatOpponent = true;
    }
  }
  if (repeatOpponent) explanations.push({ code: 'REPEAT_OPPONENT' });

  if (all.some((id) => players.get(id)!.lastCourt === court)) {
    explanations.push({ code: 'SAME_COURT_AS_LAST_ROUND' });
  }

  return explanations;
}

interface SplitResult {
  teamA: Team;
  teamB: Team;
  score: number;
}

function bestSplit(
  players: Map<string, PlayerState>,
  four: string[],
  court: number,
  beginnerThreshold: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
): SplitResult {
  const [a, b, c, d] = four as [string, string, string, string];
  const options: [Team, Team][] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ];

  let best: SplitResult | undefined;
  for (const [teamA, teamB] of options) {
    const score = scoreGame(players, teamA, teamB, court, beginnerThreshold, partnerCounts, opponentCounts);
    if (!best || score < best.score) best = { teamA, teamB, score };
  }
  return best!;
}

const HILL_CLIMB_ITERATIONS = 200;

/**
 * Splits already-selected playing IDs into foursomes assigned to courts, then runs a bounded
 * randomised hill climb (swap one player between two courts, keep it if total penalty drops)
 * to improve the grouping. Player counts here are small (<= ~16), so this is cheap.
 */
export function splitIntoGames(
  playingIds: string[],
  courts: number[],
  players: Map<string, PlayerState>,
  beginnerThreshold: number,
  partnerCounts: Map<string, number>,
  opponentCounts: Map<string, number>,
  rng: Rng,
): GameAssignment[] {
  const slots = courts.length;
  let groups: string[][] = [];
  for (let i = 0; i < slots; i++) {
    groups.push(playingIds.slice(i * 4, i * 4 + 4));
  }

  function evaluate(gs: string[][]): { total: number; splits: SplitResult[] } {
    const splits = gs.map((group, i) => bestSplit(players, group, courts[i]!, beginnerThreshold, partnerCounts, opponentCounts));
    const total = splits.reduce((sum, s) => sum + s.score, 0);
    return { total, splits };
  }

  let current = evaluate(groups);

  if (slots >= 2) {
    for (let iter = 0; iter < HILL_CLIMB_ITERATIONS; iter++) {
      const gi = Math.floor(rng() * slots);
      let gj = Math.floor(rng() * slots);
      if (gj === gi) gj = (gj + 1) % slots;

      const candidate = groups.map((g) => [...g]);

      // Swap one player between the two groups; half the time swap a second pair too, so
      // the search can also reach states that a single swap would have to pass through a
      // worse intermediate state to reach (e.g. redistributing 4 beginners stacked on one
      // court into 2-and-2 across two courts).
      const swapCount = rng() < 0.5 ? 1 : 2;
      const usedI = new Set<number>();
      const usedJ = new Set<number>();
      for (let s = 0; s < swapCount; s++) {
        let pi = Math.floor(rng() * 4);
        while (usedI.has(pi) && usedI.size < 4) pi = Math.floor(rng() * 4);
        let pj = Math.floor(rng() * 4);
        while (usedJ.has(pj) && usedJ.size < 4) pj = Math.floor(rng() * 4);
        usedI.add(pi);
        usedJ.add(pj);

        const tmp = candidate[gi]![pi]!;
        candidate[gi]![pi] = candidate[gj]![pj]!;
        candidate[gj]![pj] = tmp;
      }

      const candidateResult = evaluate(candidate);
      if (candidateResult.total < current.total) {
        groups = candidate;
        current = candidateResult;
      }
    }
  }

  return current.splits.map((split, i) => ({
    court: courts[i]!,
    teamA: split.teamA,
    teamB: split.teamB,
    explanations: explainGame(players, split.teamA, split.teamB, courts[i]!, beginnerThreshold, partnerCounts, opponentCounts),
  }));
}
