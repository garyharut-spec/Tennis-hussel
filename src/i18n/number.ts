import type { Language } from './types.ts';

export function formatDecimal(value: number, language: Language): string {
  const str = value.toFixed(1);
  return language === 'nl' ? str.replace('.', ',') : str;
}

export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
