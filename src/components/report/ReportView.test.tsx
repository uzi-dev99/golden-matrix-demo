import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { ReportView } from './ReportView';

const source = readFileSync(fileURLToPath(new URL('./ReportView.tsx', import.meta.url)), 'utf8');

describe('ReportView', () => {
  test('AC12 — "## " becomes an h2 and raw HTML is not executed', () => {
    const html = renderToStaticMarkup(<ReportView text={'## Visión general\n\nTexto del informe.\n\n<script>alert(1)</script>'} />);
    expect(html).toContain('<h2>Visión general</h2>');
    expect(html).toContain('Texto del informe.');
    expect(html).not.toContain('<script>');
  });
  test('AC12 — the caret only shows while streaming', () => {
    expect(renderToStaticMarkup(<ReportView text="Hola" streaming />)).toContain('data-typing="true"');
    expect(renderToStaticMarkup(<ReportView text="Hola" />)).not.toContain('data-typing');
  });
  test('AC18 — the reveal asks for the reduced-motion preference', () => {
    // The panel has no DOM test library (no new dependency): the query is pinned in the source.
    expect(source).toContain("matchMedia('(prefers-reduced-motion: reduce)')");
  });
});
