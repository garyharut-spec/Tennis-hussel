export interface TimeSlot {
  index: number;
  start: string;
  end: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Drops a trailing partial round; returns [] when end is not after start. */
export function computeTimeGrid(start: string, end: string, gameMinutes: number, gapMinutes: number): TimeSlot[] {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  if (endMin <= startMin) return [];

  const slotLength = gameMinutes + gapMinutes;
  const slots: TimeSlot[] = [];
  let cursor = startMin;
  let index = 0;
  while (cursor + gameMinutes <= endMin) {
    slots.push({ index, start: toHHMM(cursor), end: toHHMM(cursor + gameMinutes) });
    cursor += slotLength;
    index += 1;
  }
  return slots;
}
