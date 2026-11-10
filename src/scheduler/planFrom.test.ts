import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { computeTimeGrid } from './timeGrid.ts';
import { foldRoundIntoStats, type PlayerState } from './playerState.ts';
import { planFrom, type BasicPlayer, type RoundLike } from './planFrom.ts';

function makePlayers(n: number): BasicPlayer[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, level: i % 3 === 0 ? 8.5 : 4.0 }));
}

describe('planFrom', () => {
  it('plans a full 19:00-22:00 night for 22 players on 4 courts with evenly spread sit-outs', () => {
    const timeGrid = computeTimeGrid('19:00', '22:00', 30, 0);
    expect(timeGrid).toHaveLength(6);

    const presentPlayers = makePlayers(22);
    const rounds = planFrom({
      roundIndex: 0,
      timeGrid,
      existingRounds: [],
      presentPlayers,
      defaultCourts: [1, 2, 3, 4],
      beginnerThreshold: 8.0,
      rng: createRng(123),
    });

    expect(rounds).toHaveLength(6);
    for (const round of rounds) {
      expect(round.games).toHaveLength(4);
      expect(round.sittingOut).toHaveLength(6);
    }

    const stats = new Map<string, PlayerState>(
      presentPlayers.map((p) => [p.id, { id: p.id, level: p.level, gamesPlayed: 0, lastPlayedRoundIndex: -1 }]),
    );
    for (const round of rounds) {
      foldRoundIntoStats(stats, new Map(), new Map(), round, round.index);
    }
    const gamesPlayed = [...stats.values()].map((s) => s.gamesPlayed);
    expect(Math.max(...gamesPlayed) - Math.min(...gamesPlayed)).toBeLessThanOrEqual(1);
  });

  it('keeps a player with leaveFromRound out of that round and every later one, but plays them before', () => {
    const timeGrid = computeTimeGrid('19:00', '21:00', 30, 0); // 4 rounds
    const players: BasicPlayer[] = makePlayers(8).map((p) => (p.id === 'p0' ? { ...p, leaveFromRound: 2 } : p));
    const rounds = planFrom({
      roundIndex: 0,
      timeGrid,
      existingRounds: [],
      presentPlayers: players,
      defaultCourts: [1, 2, 3, 4],
      beginnerThreshold: 8.0,
      rng: createRng(7),
    });
    const appears = (r: RoundLike) => [...r.games.flatMap((g) => [...g.teamA, ...g.teamB]), ...r.sittingOut].includes('p0');
    expect(rounds.map(appears)).toEqual([true, true, false, false]);
  });

  it('onlyThisRound regenerates just that round and keeps every later round as-is', () => {
    const timeGrid = computeTimeGrid('19:00', '21:00', 30, 0);
    const presentPlayers = makePlayers(12);
    const base = { timeGrid, presentPlayers, defaultCourts: [1, 2], beginnerThreshold: 8.0 };
    const first = planFrom({ ...base, roundIndex: 0, existingRounds: [], rng: createRng(1) });

    const changedFor = (seed: number) => {
      const out = planFrom({ ...base, roundIndex: 1, existingRounds: first, rng: createRng(seed), onlyThisRound: true });
      expect(out[0]).toEqual(first[0]);
      expect(out[2]).toEqual(first[2]);
      expect(out[3]).toEqual(first[3]);
      return JSON.stringify(out[1]) !== JSON.stringify(first[1]);
    };
    expect([1, 2, 3, 4, 5, 6].some(changedFor)).toBe(true);
  });

  it('preserves locked rounds and rounds before roundIndex untouched', () => {
    const timeGrid = computeTimeGrid('19:00', '21:00', 30, 0); // 4 rounds
    const presentPlayers = makePlayers(8);

    const first = planFrom({
      roundIndex: 0,
      timeGrid,
      existingRounds: [],
      presentPlayers,
      defaultCourts: [1, 2],
      beginnerThreshold: 8.0,
      rng: createRng(1),
    });

    const lockedRound2: RoundLike = { ...first[2]!, locked: true };
    const existingRounds = [first[0]!, first[1]!, lockedRound2, first[3]!];

    const replanned = planFrom({
      roundIndex: 1,
      timeGrid,
      existingRounds,
      presentPlayers,
      defaultCourts: [1, 2],
      beginnerThreshold: 8.0,
      rng: createRng(99), // different seed - round 3 would differ if it weren't locked/preserved
    });

    expect(replanned[0]).toEqual(first[0]);
    expect(replanned[2]).toEqual(lockedRound2);
  });

  it('gives a late arrival priority on the very next planned round', () => {
    const timeGrid = computeTimeGrid('19:00', '20:00', 30, 0); // 2 rounds
    const regulars = makePlayers(4).map((p) => ({ ...p, id: `regular-${p.id}` }));

    const round0 = planFrom({
      roundIndex: 0,
      timeGrid: [timeGrid[0]!],
      existingRounds: [],
      presentPlayers: regulars,
      defaultCourts: [1],
      beginnerThreshold: 8.0,
      rng: createRng(1),
    });

    const lateArrival: BasicPlayer = { id: 'late-arrival', level: 5.0 };
    const round1 = planFrom({
      roundIndex: 1,
      timeGrid,
      existingRounds: round0,
      presentPlayers: [...regulars, lateArrival],
      defaultCourts: [1],
      beginnerThreshold: 8.0,
      rng: createRng(1),
    });

    const secondRoundPlayers = round1[1]!.games.flatMap((g) => [...g.teamA, ...g.teamB]);
    expect(secondRoundPlayers).toContain('late-arrival');
  });

  it('excludes a leaver from every future round', () => {
    const timeGrid = computeTimeGrid('19:00', '20:30', 30, 0); // 3 rounds
    const everyone = makePlayers(5);

    const round0 = planFrom({
      roundIndex: 0,
      timeGrid: [timeGrid[0]!],
      existingRounds: [],
      presentPlayers: everyone,
      defaultCourts: [1],
      beginnerThreshold: 8.0,
      rng: createRng(1),
    });

    const leaverId = round0[0]!.games[0]!.teamA[0];
    const remaining = everyone.filter((p) => p.id !== leaverId);

    const replanned = planFrom({
      roundIndex: 1,
      timeGrid,
      existingRounds: round0,
      presentPlayers: remaining,
      defaultCourts: [1],
      beginnerThreshold: 8.0,
      rng: createRng(1),
    });

    for (const round of replanned.slice(1)) {
      const everyoneInRound = [...round.games.flatMap((g) => [...g.teamA, ...g.teamB]), ...round.sittingOut];
      expect(everyoneInRound).not.toContain(leaverId);
    }
  });
});
