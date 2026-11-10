import type { Session } from './types.ts';

function hhmmOf(now: Date): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/** Present now: not marked left, and any planned leave time has not been reached yet. */
export function isPresent(session: Session, memberId: string, now: Date = new Date()): boolean {
  const entry = session.attendance.find((a) => a.memberId === memberId);
  if (entry === undefined || entry.until !== null) return false;
  return entry.leavesAt === undefined || hhmmOf(now) < entry.leavesAt;
}

/** The planned leave time (`HH:MM`) of a player who is still here, if any. */
export function leavesAt(session: Session, memberId: string): string | undefined {
  return session.attendance.find((a) => a.memberId === memberId)?.leavesAt;
}

export function setPresent(session: Session, memberId: string, present: boolean, now: Date = new Date()): void {
  const iso = now.toISOString();
  const entry = session.attendance.find((a) => a.memberId === memberId);
  if (present) {
    if (entry) {
      entry.until = null;
      delete entry.leavesAt;
    } else {
      session.attendance.push({ memberId, from: iso, until: null });
    }
  } else if (entry) {
    entry.until = iso;
    delete entry.leavesAt;
  }
}

/** Plans (or, with null, cancels) a leave: the player skips the round starting at `hhmm` and every later one. */
export function setLeavesAt(session: Session, memberId: string, hhmm: string | null): void {
  const entry = session.attendance.find((a) => a.memberId === memberId);
  if (!entry) return;
  if (hhmm === null) delete entry.leavesAt;
  else entry.leavesAt = hhmm;
}

export function presentCount(session: Session, now: Date = new Date()): number {
  return session.attendance.filter((a) => isPresent(session, a.memberId, now)).length;
}
