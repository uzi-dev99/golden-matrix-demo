import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { ReportView } from './ReportView';

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
});
