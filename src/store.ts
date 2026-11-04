import { load, save } from './storage.ts';
import type { AppData } from './types.ts';

let data: AppData = load();
const listeners = new Set<() => void>();

export function getData(): AppData {
  return data;
}

export function updateData(mutator: (data: AppData) => void): void {
  mutator(data);
  save(data);
  for (const listener of listeners) listener();
}

export function onDataChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: resets the in-memory store to whatever storage.load() currently returns. */
export function reloadForTests(): void {
  data = load();
}
