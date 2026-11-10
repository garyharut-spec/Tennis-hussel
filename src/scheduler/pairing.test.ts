import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { splitIntoGames } from './pairing.ts';
import type { PlayerState } from './playerState.ts';

function player(id: string, level: number): PlayerState {
  return { id, level, gamesPlayed: 0, lastPlayedRoundIndex: -1 };
}

function playerMap(players: PlayerState[]): Map<string, PlayerState> {
  return new Map(players.map((p) => [p.id, p]));
}

const BEGINNER = 9.0;
const ACE = 1.0;
const THRESHOLD = 8.0;

describe('splitIntoGames', () => {
  it('produces one game per court for a single foursome', () => {
    const players = [player('a', 5), player('b', 5), player('c', 5), player('d', 5)];
    const games = splitIntoGames(['a', 'b', 'c', 'd'], [1], playerMap(players), THRESHOLD, new Map(), new Map(), createRng(1));

    expect(games).toHaveLength(1);
    expect(games[0]!.court).toBe(1);
    const allAssigned = [...games[0]!.teamA, ...games[0]!.teamB].sort();
    expect(allAssigned).toEqual(['a', 'b', 'c', 'd']);
  });

  it('flags an odd beginner count', () => {
    const players = [player('b1', BEGINNER), player('b2', BEGINNER), player('b3', BEGINNER), player('ace', ACE)];
    const games = splitIntoGames(['b1', 'b2', 'b3', 'ace'], [1], playerMap(players), THRESHOLD, new Map(), new Map(), createRng(1));

    expect(games[0]!.explanations).toContainEqual({ code: 'ODD_BEGINNERS', params: { n: 3 } });
  });

  it('still produces a valid split when all four players are beginners', () => {
    const players = [player('b1', BEGINNER), player('b2', BEGINNER), player('b3', BEGINNER), player('b4', BEGINNER)];
    const games = splitIntoGames(['b1', 'b2', 'b3', 'b4'], [1], playerMap(players), THRESHOLD, new Map(), new Map(), createRng(1));

    expect([...games[0]!.teamA, ...games[0]!.teamB].sort()).toEqual(['b1', 'b2', 'b3', 'b4']);
  });

  it('puts two beginners on opposite teams rather than together', () => {
    const players = [player('b1', BEGINNER), player('b2', BEGINNER), player('ace1', ACE), player('ace2', ACE)];
    const games = splitIntoGames(
      ['b1', 'b2', 'ace1', 'ace2'],
      [1],
      playerMap(players),
      THRESHOLD,
      new Map(),
      new Map(),
      createRng(1),
    );

    const [teamA, teamB] = [games[0]!.teamA, games[0]!.teamB];
    const beginnersOnSameTeam = (teamA.includes('b1') && teamA.includes('b2')) || (teamB.includes('b1') && teamB.includes('b2'));
    expect(beginnersOnSameTeam).toBe(false);
    expect(games[0]!.explanations.map((e) => e.code)).not.toContain('BEGINNERS_SAME_TEAM');
  });

  it('avoids a repeat partnership when an equally good alternative exists', () => {
    const players = [player('a', 5), player('b', 5), player('c', 5), player('d', 5)];
    const partnerCounts = new Map<string, number>([['a:b', 1]]);
    const games = splitIntoGames(['a', 'b', 'c', 'd'], [1], playerMap(players), THRESHOLD, partnerCounts, new Map(), createRng(1));

    const [teamA, teamB] = [games[0]!.teamA, games[0]!.teamB];
    const abTogether = (teamA.includes('a') && teamA.includes('b')) || (teamB.includes('a') && teamB.includes('b'));
    expect(abTogether).toBe(false);
  });

  it('flags playing on the same court as last round', () => {
    const players = [
      { ...player('a', 5), lastCourt: 3 },
      player('b', 5),
      player('c', 5),
      player('d', 5),
    ];
    const games = splitIntoGames(['a', 'b', 'c', 'd'], [3], playerMap(players), THRESHOLD, new Map(), new Map(), createRng(1));

    expect(games[0]!.explanations.map((e) => e.code)).toContain('SAME_COURT_AS_LAST_ROUND');
  });

  it('hill-climbs away from a worst-case initial grouping that stacks all beginners on one court', () => {
    const players = [
      player('b1', BEGINNER),
      player('b2', BEGINNER),
      player('b3', BEGINNER),
      player('b4', BEGINNER),
      player('n1', ACE),
      player('n2', ACE),
      player('n3', ACE),
      player('n4', ACE),
    ];
    // Deliberately bad order: all 4 beginners land in the first foursome.
    const order = ['b1', 'b2', 'b3', 'b4', 'n1', 'n2', 'n3', 'n4'];
    const games = splitIntoGames(order, [1, 2], playerMap(players), THRESHOLD, new Map(), new Map(), createRng(5));

    for (const game of games) {
      expect(game.explanations.map((e) => e.code)).not.toContain('ODD_BEGINNERS');
    }
  });
});
