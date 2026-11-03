import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import type { ReportMeta } from '@/lib/types';
import { ReportMetaStrip } from './ReportPanel';

const source = readFileSync(fileURLToPath(new URL('./ReportPanel.tsx', import.meta.url)), 'utf8');
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const moduleCss = readFileSync(fileURLToPath(new URL('./ReportPanel.module.css', import.meta.url)), 'utf8');

/** Relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** Contrast ratio between two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

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
  test('AC18 — the status keeps saying "Escribiendo" until the text has finished appearing', () => {
    expect(source).toContain("const writing = phase === 'streaming' || (phase === 'done' && revealing);");
    expect(source).toContain('onReveal={onReveal}');
    expect(source).toContain('busy || writing ? (');
  });
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

describe('ReportPanel styles', () => {
  test('AC7 — the check of a finished step is a dark ink on the green of the step', () => {
    const done = moduleCss.match(/\.step\[data-state='done'\] \.stepMark\s*\{[^}]*\}/)?.[0] ?? '';
    const stroke = done.match(/stroke='%23([0-9a-f]{6})'/i)?.[1];
    expect(stroke).toBeTruthy();
    // The app scope paints the finished step with --color-ok.
    const appShell = css.match(/\.app-shell\s*\{[^}]*\}/)?.[0] ?? '';
    const ok = appShell.match(/--color-ok:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(ok).toBeTruthy();
    // Non-text contrast: the check must reach 3:1 against the circle.
    expect(contrast(`#${stroke}`, ok!)).toBeGreaterThanOrEqual(3);
  });

  test('AC9 — the components do not ask for a weight Sora does not load', () => {
    // Sora is loaded at 200/300/400: a 500 in a sans rule is faked by the browser. JetBrains Mono
    // does load a 500, so a rule that uses the mono may ask for it.
    const rules = moduleCss.match(/[^{}]+\{[^{}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      const asksFor500 = /font-weight:\s*500/.test(rule) || /font:\s*500/.test(rule);
      if (!asksFor500) continue;
      expect(rule).toContain('var(--font-mono)');
    }
  });

  test('AC3 — the cards of the report are glass in the app screens: the background shows through', () => {
    // These three cards used to paint the opaque ground of the app, which hid the animated
    // background behind them. They carry the glass of the panels that surround them.
    for (const card of ['promptView', 'waiting', 'steps']) {
      const base = moduleCss.match(new RegExp(`\\.${card}\\s*\\{[^}]*\\}`))?.[0] ?? '';
      expect(base).not.toBe('');
      expect(base).not.toMatch(/background:\s*var\(--color-ground\)/);
    }
    const glass = moduleCss.match(/:global\(\.app-shell\)\s+\.promptView[^{]*\{[^}]*\}/)?.[0] ?? '';
    expect(glass).not.toBe('');
    expect(glass).toMatch(/background:\s*var\(--color-raised\)/);
    expect(glass).toMatch(/backdrop-filter:\s*blur\([^)]*\)\s*saturate\(/);
    expect(glass).toMatch(/border:\s*1px solid var\(--color-line\)/);
    // The fill of the glass is the translucent token of the app, not an opaque colour.
    const appShell = css.match(/\.app-shell\s*\{[^}]*\}/)?.[0] ?? '';
    const raised = appShell.match(/--color-raised:\s*([^;]+);/)?.[1] ?? '';
    expect(raised).toMatch(/rgba?\(/);
    expect(parseFloat(raised.split(',')[3] ?? '1')).toBeLessThan(1);
  });
});
