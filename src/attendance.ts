import type { Session } from './types.ts';

export function isPresent(session: Session, memberId: string): boolean {
  const entry = session.attendance.find((a) => a.memberId === memberId);
  return entry !== undefined && entry.until === null;
}

export function setPresent(session: Session, memberId: string, present: boolean, now: Date = new Date()): void {
  const iso = now.toISOString();
  const entry = session.attendance.find((a) => a.memberId === memberId);
  if (present) {
    if (entry) {
      entry.until = null;
    } else {
      session.attendance.push({ memberId, from: iso, until: null });
    }
  } else if (entry) {
    entry.until = iso;
  }
}

export function presentCount(session: Session): number {
  return session.attendance.filter((a) => a.until === null).length;
}
