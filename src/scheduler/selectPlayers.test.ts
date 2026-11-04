import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { selectPlayers } from './selectPlayers.ts';
import type { PlayerState } from './playerState.ts';

function player(id: string, level: number, gamesPlayed: number, lastPlayedRoundIndex: number): PlayerState {
  return { id, level, gamesPlayed, lastPlayedRoundIndex };
}

describe('selectPlayers', () => {
  it('nobody plays with zero slots', () => {
    const present = [player('a', 5, 0, -1), player('b', 5, 0, -1)];
    const { playing, sittingOut } = selectPlayers(present, 0, 0, createRng(1));
    expect(playing).toEqual([]);
    expect(sittingOut).toHaveLength(2);
  });

  it('picks fewest games played first, ignoring level entirely', () => {
    const present = [
      player('beginner-fewer-games-1', 9.0, 0, -1),
      player('beginner-fewer-games-2', 9.0, 0, -1),
      player('ace-fewer-games-1', 1.0, 0, -1),
      player('ace-fewer-games-2', 1.0, 0, -1),
      player('ace-more-games', 1.0, 3, 0),
      player('beginner-more-games', 9.0, 3, 0),
      player('ace-more-games-2', 1.0, 3, 0),
      player('beginner-more-games-2', 9.0, 3, 0),
    ];
    const { playing, sittingOut } = selectPlayers(present, 1, 1, createRng(1));
    expect(playing.map((p) => p.id).sort()).toEqual([
      'ace-fewer-games-1',
      'ace-fewer-games-2',
      'beginner-fewer-games-1',
      'beginner-fewer-games-2',
    ]);
    expect(sittingOut.map((p) => p.id).sort()).toEqual([
      'ace-more-games',
      'ace-more-games-2',
      'beginner-more-games',
      'beginner-more-games-2',
    ]);
  });

  it('breaks ties by longest wait, treating never-played as the longest wait', () => {
    const present = [
      player('never-played', 5, 0, -1),
      player('played-long-ago', 5, 0, 0),
      player('played-recently', 5, 0, 4),
    ];
    const { playing } = selectPlayers(present, 5, 10, createRng(1));
    expect(playing.map((p) => p.id)).toEqual(['never-played', 'played-long-ago', 'played-recently']);
  });

  it('takes min(need, available) when fewer than 4*slots are present', () => {
    const present = [player('a', 5, 0, -1), player('b', 5, 0, -1), player('c', 5, 0, -1)];
    const { playing, sittingOut } = selectPlayers(present, 0, 1, createRng(1));
    expect(playing).toHaveLength(3);
    expect(sittingOut).toHaveLength(0);
  });
});
