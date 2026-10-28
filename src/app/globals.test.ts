import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');

describe('globals.css', () => {
  test('AC-visual — "Rellenar los campos" is an underlined text link, not a grey button', () => {
    expect(css).toMatch(/\.btn-text\s*\{[^}]*text-decoration:\s*underline/);
    expect(css).toMatch(/\.btn-text\s*\{[^}]*background:\s*none/);
  });

  test('AC-visual — table cells have padding, so the columns do not touch', () => {
    expect(css).toMatch(/^\s*td\s*\{[^}]*padding/m);
    expect(css).toMatch(/^\s*th\s*\{[^}]*padding/m);
  });
});

describe('app icon', () => {
  test('AC-visual — the app ships an icon, so the browser stops asking for /favicon.ico', () => {
    expect(existsSync(fileURLToPath(new URL('./icon.svg', import.meta.url)))).toBe(true);
  });
});
