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
