import { isPresent, leavesAt, setLeavesAt } from './attendance.ts';
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

/** Index of the first round a player will not play because of a planned leave time; undefined if none. */
function leaveRoundIndex(session: Session, memberId: string): number | undefined {
  const at = leavesAt(session, memberId);
  if (at === undefined) return undefined;
  const grid = timeGridFor(session);
  return (grid.find((s) => s.start >= at) ?? { index: grid.length }).index;
}

/** Start times (`HH:MM`) of the rounds that have not begun yet, in order. */
export function upcomingRoundStarts(session: Session, now: Date = new Date()): string[] {
  const first = firstReplanIndex(session, now);
  return timeGridFor(session)
    .filter((s) => s.index >= first)
    .map((s) => s.start);
}

/**
 * Plans (or with null cancels) a player's leave and re-plans the unlocked rounds from the first one the
 * change affects, so the schedule already reflects it. Rounds that have started or are locked stay as they are.
 */
export function changeLeave(data: AppData, session: Session, memberId: string, hhmm: string | null, now: Date = new Date()): void {
  const before = leaveRoundIndex(session, memberId);
  setLeavesAt(session, memberId, hhmm);
  const after = leaveRoundIndex(session, memberId);
  if (session.rounds.length === 0) return;
  const from = Math.max(Math.min(before ?? Infinity, after ?? Infinity), firstReplanIndex(session, now));
  if (from >= timeGridFor(session).length) return;
  regenerateFrom(data, session, from, now);
}

/** Regenerates every unlocked round from roundIndex onward using who is currently present. */
export function regenerateFrom(data: AppData, session: Session, roundIndex: number, now: Date = new Date(), onlyThisRound = false): void {
  const presentPlayers = data.roster
    .filter((m) => isPresent(session, m.id, now))
    .map((m) => ({ id: m.id, level: m.level, leaveFromRound: leaveRoundIndex(session, m.id) }));

  const rounds = planFrom({
    roundIndex,
    timeGrid: timeGridFor(session),
    existingRounds: session.rounds.map(toSchedulerRound),
    presentPlayers,
    defaultCourts: session.config.courts,
    beginnerThreshold: session.config.beginnerThreshold,
    rng: createRng(seedFor(session.id, roundIndex, now)),
    onlyThisRound,
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

  const presentIds = new Set(
    data.roster
      .filter((m) => isPresent(session, m.id) && (leaveRoundIndex(session, m.id) ?? Infinity) > fromRoundIndex)
      .map((m) => m.id),
  );
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

export type RoundStatus = 'past' | 'now' | 'next' | 'future';

function hhmmOf(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function roundStatus(session: Session, roundIndex: number, now: Date = new Date()): RoundStatus {
  const grid = timeGridFor(session);
  const slot = grid.find((s) => s.index === roundIndex);
  if (!slot) return 'past';
  const hhmm = hhmmOf(now);
  if (hhmm >= slot.end) return 'past';
  if (hhmm >= slot.start) return 'now';
  // Not started: "next" if every earlier slot has started, else "future".
  const earlierUnstarted = grid.some((s) => s.index < roundIndex && hhmm < s.start);
  return earlierUnstarted ? 'future' : 'next';
}

/** Index of the first round that has not started yet; the grid length if all have. */
export function firstReplanIndex(session: Session, now: Date = new Date()): number {
  const grid = timeGridFor(session);
  const hhmm = hhmmOf(now);
  const first = grid.find((s) => hhmm < s.start);
  return first ? first.index : grid.length;
}
