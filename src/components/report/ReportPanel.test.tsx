import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { ReportMeta } from '@/lib/types';
import { ReportMetaStrip } from './ReportPanel';

const source = readFileSync(fileURLToPath(new URL('./ReportPanel.tsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');

const meta: ReportMeta = {
  model: 'openrouter/free',
  servedModel: 'Gemma 4 31B',
  latencyMs: 9800,
  firstTokenMs: 1200,
  promptTokens: 586,
  completionTokens: 718,
  totalTokens: 1304,
  costUsd: 0,
  promptVersion: 'astrolabio-prompt/1.0.0',
};

describe('ReportPanel defaults', () => {
  test('AC12 — the default length is short, so a free model finishes in about 30 s', () => {
    expect(source).toContain("useState<PromptOptions>({ tone: 'neutral', length: 'short' })");
  });
});

describe('ReportMetaStrip', () => {
  test('AC12 — before a run every metric is a dash', () => {
    const html = renderToStaticMarkup(<ReportMetaStrip meta={null} free={false} />);
    expect(html.match(/—/g)?.length).toBe(4);
    expect(html).not.toContain('/print');
  });
  test('AC12 — after the run it shows model, latency, tokens and cost', () => {
    const html = renderToStaticMarkup(<ReportMetaStrip meta={meta} free />);
    expect(html).toContain('Gemma 4 31B');
    expect(html).toContain('pedido: openrouter/free');
    expect(html).toContain('9,8 s');
    expect(html).toContain('primer token 1,2 s');
    expect(html).toContain('1\u2009304');
    expect(html).toContain('586 entrada · 718 salida');
    expect(html).toContain('0 US$');
    expect(html).toContain('modelo gratuito');
    expect(html).toContain('Imprimir o guardar PDF');
  });
  test('AC12 — an estimated count is marked with ≈', () => {
    const html = renderToStaticMarkup(<ReportMetaStrip meta={{ ...meta, usageEstimated: true }} free={false} />);
    expect(html).toContain('≈1\u2009304');
  });
  test('AC9 — the "Detener" button keeps the 44 px tap target of .btn', () => {
    expect(source).not.toMatch(/minHeight/);
    expect(css).toMatch(/\.btn\s*\{[^}]*min-height:\s*44px/);
  });
  test('AC12 — an error event leaves the panel in the error phase, so the button comes back', () => {
    // The panel has no DOM test library (no new dependency): the phase change is pinned in the source.
    expect(source).toMatch(/setError\(ev\.message\);\s*setPhase\('error'\);/);
    expect(source).toMatch(/const busy = phase === 'requesting' \|\| phase === 'streaming';/);
  });
});
