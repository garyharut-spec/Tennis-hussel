import type { AppData, Session } from './types.ts';

export function todayId(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function ensureSession(data: AppData, now: Date = new Date()): Session {
  if (!data.currentSession) {
    data.currentSession = {
      id: todayId(now),
      config: { ...data.defaults },
      attendance: [],
      rounds: [],
    };
  }
  return data.currentSession;
}
