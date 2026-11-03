import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NatalWheel } from '@/components/astrology/NatalWheel';
import { AppHeader } from '@/components/shell/AppHeader';
import { madridChart, madridInput } from '@/components/shell/chart-fixture.test-utils';
import { ResultsView } from '@/components/shell/ResultsView';
import HomePage from './(app)/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');
const reportCss = readFileSync(fileURLToPath(new URL('../components/report/ReportPanel.module.css', import.meta.url)), 'utf8');
// The comments are not declarations: they are removed before the CSS is parsed.
const plainCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of a rule that opens with `header`, up to its closing brace. */
function blockOf(source: string, header: string): string {
  const start = source.indexOf(header);
  if (start < 0) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return '';
}

/** The body of the `@media (prefers-reduced-motion: no-preference)` block, where the motion lives. */
function noPreferenceBlock(): string {
  return blockOf(plainCss, '@media (prefers-reduced-motion: no-preference)');
}

/** The body of a `@keyframes` block. */
function keyframesBody(name: string): string {
  return blockOf(plainCss, `@keyframes ${name}`);
}

describe('motion tokens', () => {
  test('AC1 — the motion layer has its own tokens: the premium curve and the durations', () => {
    const root = blockOf(css, ':root');
    expect(root).toMatch(/--ease-premium:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
    expect(root).toMatch(/--dur-enter:\s*\d+ms/);
    expect(root).toMatch(/--dur-reveal:\s*\d+ms/);
  });
});

describe('motion layer (GMD-3)', () => {
  test('AC1 — the keyframes of the motion layer animate transform properties and opacity only', () => {
    const names = [...plainCss.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const properties = [...keyframesBody(name).matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
      for (const property of properties) expect(['opacity', 'transform', 'translate', 'rotate', 'scale']).toContain(property);
    }
  });

  test('AC2 — the entrances are declared only where motion is allowed', () => {
    // With reduced motion the browser must compute `animation-name: none`: the declarations live
    // inside a `prefers-reduced-motion: no-preference` block, so they are not applied at all.
    // The longhand counts too: an `animation-name:` outside the block would run anyway.
    const block = noPreferenceBlock();
    expect(block).not.toBe('');
    // The comments are not declarations: the check runs on the CSS without them.
    const start = plainCss.indexOf('@media (prefers-reduced-motion: no-preference)');
    for (const match of plainCss.matchAll(/animation(-name)?:/g)) {
      expect(match.index).toBeGreaterThan(start);
      expect(match.index).toBeLessThan(start + block.length);
    }
  });

  test('AC1 — the login hero staggers its entrance: the nav first, then the panel blocks', () => {
    const block = noPreferenceBlock();
    expect(block).toMatch(/\.hero__nav\s*\{[^}]*animation:/);
    expect(block).toMatch(/\.hero__panel\s*\{[^}]*animation:/);
    // The blocks of the panel follow one another: at least three different delays.
    expect(block.match(/\.hero__panel\s*>\s*:nth-child\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  test('AC1 — the app screens announce their entrance', () => {
    expect(renderToStaticMarkup(<AppHeader user="demo" />)).toContain('motion-rise');
    expect(renderToStaticMarkup(<HomePage />)).toContain('motion-rise');
    expect(renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />)).toContain('motion-rise');
  });

  test('AC1 — the wheel draws its planets and its aspects in, from the centre of each symbol', () => {
    expect(renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />)).toContain('wheel');
    const block = noPreferenceBlock();
    expect(block).toMatch(/\[id\$='-radix-planets'\]\s*>\s*g\s*\{[^}]*transform-box:\s*fill-box/);
    expect(block).toMatch(/\[id\$='-aspects'\]\s*>\s*line\s*\{[^}]*animation:/);
  });

  test('AC2 — the streaming tail glows, and the reduced motion takes the motion away', () => {
    expect(reportCss).toMatch(/\.reveal\[data-typing\][^{]*\{[^}]*text-shadow:/);
    expect(reportCss).toMatch(/\.reveal\[data-typing\][^{]*::after\s*\{[^}]*animation:/);
    const reduced = blockOf(reportCss, '@media (prefers-reduced-motion: reduce)');
    expect(reduced).toMatch(/animation:\s*none/);
    // The module CSS switches its motion off with the shorthand, which resets the longhand too.
    expect(reportCss).not.toMatch(/animation-name:/);
  });
});
