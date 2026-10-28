import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../../app/print/print.css', import.meta.url)), 'utf8');

describe('print.css', () => {
  test('AC13 — the sheet is A4', () => {
    expect(css).toContain('@page { size: A4;');
  });
  test('AC13 — every sheet ends its page and no table is split', () => {
    expect(css).toContain('break-after: page');
    expect(css).toContain('break-inside: avoid');
    expect(css).toContain('display: table-header-group');
  });
  test('AC-visual — the sheet fits the viewport on screen', () => {
    expect(css).toMatch(/\.sheet\s*\{[^}]*max-width:\s*100%/);
    const mobile = css.slice(css.indexOf('@media screen'), css.indexOf('@media print'));
    expect(mobile).toMatch(/\.big3\s*\{[^}]*grid-template-columns:\s*1fr/);
  });
  test('AC13 — the toolbar does not print', () => {
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toMatch(/\.no-print\s*\{[^}]*display:\s*none/);
  });
});
