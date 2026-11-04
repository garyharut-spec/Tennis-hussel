import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { en } from './en.ts';
import { nl } from './nl.ts';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      if (entry === 'i18n') continue; // dictionaries legitimately contain the strings
      files.push(...listSourceFiles(fullPath));
    } else if (/\.ts$/.test(entry) && !entry.endsWith('.test.ts') && entry !== 'vite-env.d.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

function plainStringValues(dict: object): string[] {
  return Object.values(dict).filter((v): v is string => typeof v === 'string');
}

describe('no hard-coded UI text outside src/i18n', () => {
  const translatedStrings = [...new Set([...plainStringValues(en), ...plainStringValues(nl)])];

  it('contains at least the known translated strings (sanity check)', () => {
    expect(translatedStrings.length).toBeGreaterThan(0);
  });

  it('never appears as a literal in app source files', () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(SRC_DIR)) {
      const contents = readFileSync(file, 'utf-8');
      for (const str of translatedStrings) {
        if (contents.includes(`'${str}'`) || contents.includes(`"${str}"`) || contents.includes(`\`${str}\``)) {
          offenders.push(`${file}: "${str}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
