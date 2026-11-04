import { en } from './en.ts';
import { nl } from './nl.ts';
import type { Language, Messages } from './types.ts';

export type { Language };

const LANGUAGE_STORAGE_KEY = 'hussel:language';

const dictionaries: Record<Language, Messages> = { en, nl };

type Args<K extends keyof Messages> = Messages[K] extends (...args: infer A) => string ? A : [];

function detectInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'nl') return stored;
  } catch {
    // localStorage unavailable (e.g. privacy mode); fall through to detection.
  }
  return navigator.language?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

let currentLanguage: Language = detectInitialLanguage();
document.documentElement.lang = currentLanguage;
const listeners = new Set<(language: Language) => void>();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(language: Language): void {
  currentLanguage = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore persistence failures
  }
  document.documentElement.lang = language;
  for (const listener of listeners) listener(language);
}

export function onLanguageChange(listener: (language: Language) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t<K extends keyof Messages>(key: K, ...args: Args<K>): string {
  const entry = dictionaries[currentLanguage][key];
  if (typeof entry === 'function') {
    return (entry as unknown as (...a: Args<K>) => string)(...args);
  }
  return entry as string;
}
