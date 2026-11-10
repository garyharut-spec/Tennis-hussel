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

export interface MoveResult {
  ok: boolean;
  reason?: 'LOCKED' | 'NOT_FOUND' | 'OCCUPIED';
}

/**
 * Moves one player into an empty court slot (creating the game if the court had none),
 * leaving their old slot empty. A game left with nobody is removed. This is how a 4-player
 * court is split into two 2-player games, or how two lone players are joined back together.
 * Moving into an occupied slot is refused; use swapPlayers for that.
 */
export function movePlayerToCourt(round: Round, playerId: string, court: number, team: 'A' | 'B'): MoveResult {
  if (round.locked) return { ok: false, reason: 'LOCKED' };
  const from = locate(round, playerId);
  if (!from) return { ok: false, reason: 'NOT_FOUND' };

  let target = round.games.find((g) => g.court === court);
  const targetTeam = target ? (team === 'A' ? target.teamA : target.teamB) : [];
  if (targetTeam.length >= 2) return { ok: false, reason: 'OCCUPIED' };
  if (from.type === 'court' && from.court === court && from.team === team) return { ok: false, reason: 'OCCUPIED' };

  if (from.type === 'sittingOut') {
    round.sittingOut.splice(from.index, 1);
  } else {
    const source = round.games.find((g) => g.court === from.court)!;
    const sourceTeam = from.team === 'A' ? source.teamA : source.teamB;
    sourceTeam.splice(from.position, 1);
    source.explanations = undefined;
    if (source.teamA.length === 0 && source.teamB.length === 0) round.games = round.games.filter((g) => g !== source);
  }

  if (!target) {
    target = { court, teamA: [], teamB: [] };
    round.games.push(target);
    round.games.sort((a, b) => a.court - b.court);
  }
  (team === 'A' ? target.teamA : target.teamB).push(playerId);
  target.explanations = undefined;
  return { ok: true };
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
