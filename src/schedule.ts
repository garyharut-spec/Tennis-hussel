import { isPresent } from './attendance.ts';
import { computeTimeGrid, createRng, planFrom, type RoundLike } from './scheduler/index.ts';
import type { AppData, Round, Session } from './types.ts';

function toPersistedRound(r: RoundLike): Round {
  return {
    index: r.index,
    start: r.start,
    games: r.games.map((g) => ({ court: g.court, teamA: g.teamA, teamB: g.teamB, explanations: g.explanations })),
    sittingOut: r.sittingOut,
    locked: r.locked,
  };
}

function toSchedulerRound(r: Round): RoundLike {
  return {
    index: r.index,
    start: r.start,
    games: r.games.map((g) => ({ court: g.court, teamA: g.teamA, teamB: g.teamB, explanations: g.explanations ?? [] })),
    sittingOut: r.sittingOut,
    locked: r.locked,
  };
}

function seedFor(sessionId: string, roundIndex: number, now: Date): number {
  const str = `${sessionId}:${roundIndex}:${now.getTime()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return hash >>> 0;
}

export function timeGridFor(session: Session): ReturnType<typeof computeTimeGrid> {
  return computeTimeGrid(session.config.start, session.config.end, session.config.gameMinutes, session.config.gapMinutes);
}

/** Regenerates every unlocked round from roundIndex onward using who is currently present. */
export function regenerateFrom(data: AppData, session: Session, roundIndex: number, now: Date = new Date()): void {
  const presentPlayers = data.roster.filter((m) => isPresent(session, m.id)).map((m) => ({ id: m.id, level: m.level }));

  const rounds = planFrom({
    roundIndex,
    timeGrid: timeGridFor(session),
    existingRounds: session.rounds.map(toSchedulerRound),
    presentPlayers,
    defaultCourts: session.config.courts,
    beginnerThreshold: session.config.beginnerThreshold,
    rng: createRng(seedFor(session.id, roundIndex, now)),
  });

  session.rounds = rounds.map(toPersistedRound);
}

export function setRoundLocked(session: Session, roundIndex: number, locked: boolean): void {
  const round = session.rounds.find((r) => r.index === roundIndex);
  if (round) round.locked = locked;
}

export function setRoundNotes(session: Session, roundIndex: number, notes: string): void {
  const round = session.rounds.find((r) => r.index === roundIndex);
  if (round) round.notes = notes || undefined;
}

/** True if who's present now doesn't match who the unlocked rounds from fromRoundIndex on were built for. */
export function needsReplan(data: AppData, session: Session, fromRoundIndex: number): boolean {
  if (session.rounds.length === 0) return timeGridFor(session).length > 0;

  const presentIds = new Set(data.roster.filter((m) => isPresent(session, m.id)).map((m) => m.id));
  const scheduledIds = new Set<string>();
  for (const round of session.rounds) {
    if (round.index < fromRoundIndex || round.locked) continue;
    for (const game of round.games) {
      for (const id of [...game.teamA, ...game.teamB]) scheduledIds.add(id);
    }
    for (const id of round.sittingOut) scheduledIds.add(id);
  }

  if (presentIds.size !== scheduledIds.size) return true;
  for (const id of presentIds) {
    if (!scheduledIds.has(id)) return true;
  }
  return false;
}

/** The round whose time window contains `now`, clamped to the grid; -1 if the grid is empty. */
export function currentRoundIndex(session: Session, now: Date = new Date()): number {
  const grid = timeGridFor(session);
  if (grid.length === 0) return -1;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (const slot of grid) {
    if (hhmm < slot.end) return slot.index;
  }
  return grid[grid.length - 1]!.index;
}
