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

function isValidAppData(value: unknown): value is AppData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['version'] === 'number' &&
    Array.isArray(v['roster']) &&
    typeof v['defaults'] === 'object' &&
    v['defaults'] !== null &&
    Array.isArray(v['history']) &&
    (v['currentSession'] === null || typeof v['currentSession'] === 'object')
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
