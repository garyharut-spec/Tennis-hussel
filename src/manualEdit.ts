import type { Round } from './types.ts';

export type Location =
  | { type: 'sittingOut'; index: number }
  | { type: 'court'; court: number; team: 'A' | 'B'; position: 0 | 1 };

export interface SwapResult {
  ok: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND' | 'NOOP';
}

function locate(round: Round, playerId: string): Location | null {
  const sittingIndex = round.sittingOut.indexOf(playerId);
  if (sittingIndex >= 0) return { type: 'sittingOut', index: sittingIndex };

  for (const game of round.games) {
    if (game.teamA[0] === playerId) return { type: 'court', court: game.court, team: 'A', position: 0 };
    if (game.teamA[1] === playerId) return { type: 'court', court: game.court, team: 'A', position: 1 };
    if (game.teamB[0] === playerId) return { type: 'court', court: game.court, team: 'B', position: 0 };
    if (game.teamB[1] === playerId) return { type: 'court', court: game.court, team: 'B', position: 1 };
  }
  return null;
}

function setAt(round: Round, loc: Location, playerId: string): void {
  if (loc.type === 'sittingOut') {
    round.sittingOut[loc.index] = playerId;
    return;
  }
  const game = round.games.find((g) => g.court === loc.court)!;
  const team = loc.team === 'A' ? game.teamA : game.teamB;
  team[loc.position] = playerId;
  game.explanations = undefined;
}

/**
 * Swaps two players wherever they currently are in the round (court<->court,
 * court<->sitting-out). This is the single manual-override path both drag-and-drop and
 * tap-to-swap go through, so locking and validation apply the same way either way.
 */
export function swapPlayers(round: Round, playerAId: string, playerBId: string): SwapResult {
  if (round.locked) return { ok: false, reason: 'LOCKED' };
  if (playerAId === playerBId) return { ok: false, reason: 'NOOP' };

  const locA = locate(round, playerAId);
  const locB = locate(round, playerBId);
  if (!locA || !locB) return { ok: false, reason: 'NOT_FOUND' };
  if (locA.type === 'sittingOut' && locB.type === 'sittingOut') return { ok: false, reason: 'NOOP' };

  setAt(round, locA, playerBId);
  setAt(round, locB, playerAId);
  return { ok: true };
}
