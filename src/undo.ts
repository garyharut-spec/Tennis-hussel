import type { Round } from './types.ts';

const MAX_DEPTH = 20;
let stack: Round[][] = [];

export function pushUndoSnapshot(rounds: Round[]): void {
  stack.push(structuredClone(rounds));
  if (stack.length > MAX_DEPTH) stack.shift();
}

export function popUndoSnapshot(): Round[] | undefined {
  return stack.pop();
}

export function canUndo(): boolean {
  return stack.length > 0;
}

export function clearUndo(): void {
  stack = [];
}
