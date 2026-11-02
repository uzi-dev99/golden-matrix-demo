import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../globals.css', import.meta.url)), 'utf8');

describe('login hero styles', () => {
  test('AC3 — with reduced motion the video is hidden and the poster keeps the frame', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.hero__media video\s*\{\s*display:\s*none/,
    );
  });

  test('AC1 — the hero paints the dark identity tokens and the mono/display fonts', () => {
    expect(css).toMatch(/\.hero\s*\{[^}]*--text:\s*#ffffff/);
    expect(css).toMatch(/\.hero\s*\{[^}]*--font-display:/);
  });

  test('AC3 — at 390px the panel stacks under the hero', () => {
    expect(css).toMatch(/@media \(max-width:\s*720px\)/);
    expect(css).toMatch(/\.hero__media\s*\{[^}]*height:\s*46svh/);
  });

  test('AC2 — the credentials in the note keep their case: the login compares them case-sensitively', () => {
    expect(css).toMatch(/\.hero__note code\s*\{[^}]*text-transform:\s*none/);
  });
});
