import type { AppData, Defaults } from './types.ts';

const STORAGE_KEY = 'hussel:data';
export const CURRENT_VERSION = 1;

export const DEFAULT_DEFAULTS: Defaults = {
  courts: [1, 2, 3, 4],
  start: '19:00',
  end: '22:00',
  gameMinutes: 30,
  gapMinutes: 0,
  beginnerThreshold: 8.0,
};

export class ImportError extends Error {}

function emptyData(): AppData {
  return {
    version: CURRENT_VERSION,
    roster: [],
    defaults: { ...DEFAULT_DEFAULTS },
    history: [],
    currentSession: null,
  };
}

function isValidMember(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m['id'] === 'string' &&
    typeof m['firstName'] === 'string' &&
    (m['lastInitial'] === undefined || typeof m['lastInitial'] === 'string') &&
    typeof m['level'] === 'number'
  );
}

function isValidHistoryEntry(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const h = value as Record<string, unknown>;
  return (
    typeof h['date'] === 'string' &&
    typeof h['players'] === 'number' &&
    typeof h['courts'] === 'number' &&
    typeof h['rounds'] === 'number'
  );
}

function isValidDefaults(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    Array.isArray(d['courts']) &&
    d['courts'].every((c) => typeof c === 'number') &&
    typeof d['start'] === 'string' &&
    typeof d['end'] === 'string' &&
    typeof d['gameMinutes'] === 'number' &&
    typeof d['gapMinutes'] === 'number' &&
    typeof d['beginnerThreshold'] === 'number'
  );
}

function isValidTeam(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every((id) => typeof id === 'string');
}

function isValidGame(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const g = value as Record<string, unknown>;
  return typeof g['court'] === 'number' && isValidTeam(g['teamA']) && isValidTeam(g['teamB']);
}

function isValidRound(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r['index'] === 'number' &&
    typeof r['start'] === 'string' &&
    Array.isArray(r['games']) &&
    r['games'].every(isValidGame) &&
    Array.isArray(r['sittingOut']) &&
    r['sittingOut'].every((id) => typeof id === 'string') &&
    typeof r['locked'] === 'boolean' &&
    (r['notes'] === undefined || typeof r['notes'] === 'string')
  );
}

function isValidAttendance(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return typeof a['memberId'] === 'string' && typeof a['from'] === 'string' && (a['until'] === null || typeof a['until'] === 'string');
}

function isValidSession(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    isValidDefaults(s['config']) &&
    Array.isArray(s['attendance']) &&
    s['attendance'].every(isValidAttendance) &&
    Array.isArray(s['rounds']) &&
    s['rounds'].every(isValidRound)
  );
}

function isValidAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['version'] === 'number' &&
    Array.isArray(v['roster']) &&
    v['roster'].every(isValidMember) &&
    isValidDefaults(v['defaults']) &&
    Array.isArray(v['history']) &&
    v['history'].every(isValidHistoryEntry) &&
    (v['currentSession'] === null || isValidSession(v['currentSession']))
  );
}

/** No migrations exist yet; future versions add cases here before returning CURRENT_VERSION data. */
function migrate(data: AppData): AppData {
  if (data.version !== CURRENT_VERSION) {
    throw new ImportError(`Unsupported data version: ${data.version}`);
  }
  return data;
}

export function load(): AppData {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return emptyData();
  }
  if (!raw) return emptyData();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidAppData(parsed)) return emptyData();
    return migrate(parsed);
  } catch {
    return emptyData();
  }
}

export function save(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(json: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ImportError('Invalid JSON');
  }
  if (!isValidAppData(parsed)) {
    throw new ImportError('Invalid Hussel data file');
  }
  return migrate(parsed);
}
