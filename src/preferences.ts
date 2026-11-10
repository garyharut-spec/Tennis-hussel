const SOUND_KEY = 'hussel:sound-enabled';
const WALL_MODE_KEY = 'hussel:wall-mode';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore persistence failures (e.g. private browsing)
  }
}

export type Theme = 'light' | 'dark';
const THEME_KEY = 'hussel:theme';

/** The explicit choice, or null when the user has not chosen (then the OS setting applies). */
export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function getEffectiveTheme(): Theme {
  return (
    getStoredTheme() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );
}

export function applyTheme(): void {
  const stored = getStoredTheme();
  if (stored) document.documentElement.dataset['theme'] = stored;
  else delete document.documentElement.dataset['theme'];
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore persistence failures (e.g. private browsing)
  }
  applyTheme();
}

export function isSoundEnabled(): boolean {
  return readFlag(SOUND_KEY);
}

export function setSoundEnabled(value: boolean): void {
  writeFlag(SOUND_KEY, value);
}

export function isWallMode(): boolean {
  return readFlag(WALL_MODE_KEY);
}

export function setWallMode(value: boolean): void {
  writeFlag(WALL_MODE_KEY, value);
  document.body.classList.toggle('wall-mode', value);
}
