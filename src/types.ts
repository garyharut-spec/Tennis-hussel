export interface Member {
  id: string;
  firstName: string;
  lastInitial?: string;
  level: number;
}

export interface Defaults {
  courts: number[];
  start: string;
  end: string;
  gameMinutes: number;
  gapMinutes: number;
  beginnerThreshold: number;
}

export type SessionConfig = Defaults;

export interface Attendance {
  memberId: string;
  from: string;
  until: string | null;
}

export interface Game {
  court: number;
  teamA: [string, string];
  teamB: [string, string];
}

export interface Round {
  index: number;
  start: string;
  games: Game[];
  sittingOut: string[];
  locked: boolean;
}

export interface Session {
  id: string;
  config: SessionConfig;
  attendance: Attendance[];
  rounds: Round[];
}

export interface HistoryEntry {
  date: string;
  players: number;
  courts: number;
  rounds: number;
}

export interface AppData {
  version: number;
  roster: Member[];
  defaults: Defaults;
  history: HistoryEntry[];
  currentSession: Session | null;
}
