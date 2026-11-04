export const MIN_LEVEL = 1.0;
export const MAX_LEVEL = 9.0;
export const DEFAULT_BEGINNER_THRESHOLD = 8.0;

/** Accepts an optional single decimal digit and either `.` or `,` as separator; rejects out-of-range values. */
export function parseLevel(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (value < MIN_LEVEL || value > MAX_LEVEL) return null;
  return value;
}

export function isBeginner(level: number, threshold: number = DEFAULT_BEGINNER_THRESHOLD): boolean {
  return level >= threshold;
}
