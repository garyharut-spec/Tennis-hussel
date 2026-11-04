import type { AppData } from './types.ts';

/** Appends a headcount-only history entry and drops the session (its names, attendance, rounds). */
export function closeSession(data: AppData): void {
  const session = data.currentSession;
  if (!session) return;

  const everPresent = new Set(session.attendance.map((a) => a.memberId)).size;
  data.history.push({
    date: session.id,
    players: everPresent,
    courts: session.config.courts.length,
    rounds: session.rounds.length,
  });
  data.currentSession = null;
}
