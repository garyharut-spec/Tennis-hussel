import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { scheduleRound } from './scheduleRound.ts';
import type { PlayerState } from './playerState.ts';

function players(n: number, level = 5): PlayerState[] {
  return Array.from({ length: n }, (_, i) => ({ id: `p${i}`, level, gamesPlayed: 0, lastPlayedRoundIndex: -1 }));
}

function run(presentPlayers: PlayerState[], courts: number[], seed = 1) {
  return scheduleRound({
    roundIndex: 0,
    presentPlayers,
    courts,
    beginnerThreshold: 8.0,
    partnerCounts: new Map(),
    opponentCounts: new Map(),
    rng: createRng(seed),
  });
}

describe('scheduleRound', () => {
  it.each([0, 1])('nobody plays with %i present players', (n) => {
    const result = run(players(n), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(0);
    expect(result.sittingOut).toHaveLength(n);
  });

  it('exactly 4 players fills one game with nobody sitting out', () => {
    const result = run(players(4), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(1);
    expect(result.sittingOut).toHaveLength(0);
  });

  it.each([2, 3])('%i players play one singles game on the first court; a third sits out', (n) => {
    const result = run(players(n), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]!.teamA).toHaveLength(1);
    expect(result.games[0]!.teamB).toHaveLength(1);
    expect(result.games[0]!.explanations).toEqual([{ code: 'SINGLES_GAME' }]);
    expect(result.sittingOut).toHaveLength(n - 2);
  });

  it('5 players: one doubles game, one sits out', () => {
    const result = run(players(5), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(1);
    expect(result.sittingOut).toHaveLength(1);
  });

  it.each([6, 7])('%i players: doubles on court 1 plus singles on the spare court 2', (n) => {
    const result = run(players(n), [1, 2, 3, 4]);
    expect(result.games.map((g) => [g.court, g.teamA.length + g.teamB.length])).toEqual([[1, 4], [2, 2]]);
    expect(result.sittingOut).toHaveLength(n - 6);
  });

  it('never makes singles when courts are the limit', () => {
    const result = run(players(10), [1, 2]);
    expect(result.games.every((g) => g.teamA.length === 2)).toBe(true);
    expect(result.sittingOut).toHaveLength(2);
  });

  it('9 players on 4 courts fill two games, one player sits out', () => {
    const result = run(players(9), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(2);
    expect(result.sittingOut).toHaveLength(1);
  });

  it('uses only the configured court numbers, e.g. [2, 5]', () => {
    const result = run(players(8), [2, 5]);
    expect(result.games.map((g) => g.court).sort()).toEqual([2, 5]);
  });

  it('20-24 players on 4 courts: fills all 4 courts, rest sit out', () => {
    for (const n of [20, 21, 22, 23, 24]) {
      const result = run(players(n), [1, 2, 3, 4]);
      expect(result.games).toHaveLength(4);
      expect(result.sittingOut).toHaveLength(n - 16);
    }
  });

  it('an all-beginner night still fills every court', () => {
    const result = run(players(16, 9.0), [1, 2, 3, 4]);
    expect(result.games).toHaveLength(4);
    expect(result.sittingOut).toHaveLength(0);
  });

  it('never sits out a player with strictly fewer games than someone chosen to play', () => {
    const everyone = [
      { id: 'few-games-beginner', level: 9.0, gamesPlayed: 0, lastPlayedRoundIndex: -1 },
      { id: 'many-games-ace-1', level: 1.0, gamesPlayed: 3, lastPlayedRoundIndex: -1 },
      { id: 'many-games-ace-2', level: 1.0, gamesPlayed: 3, lastPlayedRoundIndex: -1 },
      { id: 'many-games-ace-3', level: 1.0, gamesPlayed: 3, lastPlayedRoundIndex: -1 },
      { id: 'many-games-ace-4', level: 1.0, gamesPlayed: 3, lastPlayedRoundIndex: -1 },
    ];
    const result = run(everyone, [1]);
    const gamesPlayedOf = (id: string) => everyone.find((p) => p.id === id)!.gamesPlayed;
    const playingIds = result.games.flatMap((g) => [...g.teamA, ...g.teamB]);

    for (const outId of result.sittingOut) {
      for (const inId of playingIds) {
        expect(gamesPlayedOf(outId)).toBeGreaterThanOrEqual(gamesPlayedOf(inId));
      }
    }
  });
});
