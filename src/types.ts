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
  /** Local `HH:MM` start of the first round this player will NOT play; set while they are still here. */
  leavesAt?: string;
}

export type { Explanation } from './scheduler/index.ts';
import type { Explanation } from './scheduler/index.ts';

export interface Game {
  court: number;
  /** Normally 2 players per team; 1 per team (or 1 v 2 mid-edit) after a manual 2-player game is formed. */
  teamA: string[];
  teamB: string[];
  explanations?: Explanation[];
}

export interface Round {
  index: number;
  start: string;
  games: Game[];
  sittingOut: string[];
  locked: boolean;
  notes?: string;
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
  /** Every court number the organiser has used, so a court toggled off stays listed for next time. */
  knownCourts?: number[];
  history: HistoryEntry[];
  currentSession: Session | null;
}
