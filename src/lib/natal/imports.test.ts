import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const NATAL_DIR = fileURLToPath(new URL('.', import.meta.url));

const ALLOWED = new Set(['astronomy-engine', 'luxon', '@/lib/types']);
const FORBIDDEN_SEGMENTS = ['pg', 'dictionary', 'report'];

/** Specifiers the natal engine may not use: anything outside the allowed set, and the forbidden segments. */
export function importViolations(source: string): string[] {
  const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  return specifiers.filter(
    (s) =>
      (!ALLOWED.has(s) && !s.startsWith('./') && !s.startsWith('../')) ||
      s.split('/').some((segment) => FORBIDDEN_SEGMENTS.includes(segment)),
  );
}

describe('natal import guard', () => {
  test('AC5 — the engine imports nothing outside astronomy-engine, luxon, @/lib/types and relatives', () => {
    const files = readdirSync(NATAL_DIR).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(`${NATAL_DIR}/${file}`, 'utf8');
      expect(importViolations(source), file).toEqual([]);
    }
  });
  test('AC5 — the guard is not vacuous: a forbidden import is reported', () => {
    expect(importViolations("import x from '@/lib/dictionary/x'")).toEqual(['@/lib/dictionary/x']);
    expect(importViolations("import x from 'pg'")).toEqual(['pg']);
    expect(importViolations("import x from '@/lib/report/prompt'")).toEqual(['@/lib/report/prompt']);
    expect(importViolations("import x from './engine'")).toEqual([]);
    expect(importViolations("import type { NatalChart } from '@/lib/types'")).toEqual([]);
  });
});
