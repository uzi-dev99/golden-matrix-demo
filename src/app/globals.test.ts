import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');
const printCss = readFileSync(fileURLToPath(new URL('./print/print.css', import.meta.url)), 'utf8');

/** The body of the first rule whose selector is exactly `selector` (the closing brace is on its own line). */
function blockOf(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return '';
  const end = css.indexOf('\n}', start);
  return css.slice(start, end);
}

type Rgb = { r: number; g: number; b: number };
type Paint = Rgb & { a: number };

function paint(value: string): Paint {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = value.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) throw new Error(`not a color: ${value}`);
  const [r, g, b, a = 1] = rgba[1].split(',').map((p) => parseFloat(p));
  return { r, g, b, a };
}

/** The foreground over an opaque background. */
function over(fg: Paint, bg: Rgb): Rgb {
  return { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
}

function luminance({ r, g, b }: Rgb): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function token(scope: string, name: string): Paint {
  const value = scope.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
  if (!value) throw new Error(`missing token ${name}`);
  return paint(value);
}

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

describe('app identity (GMD-2)', () => {
  const scope = blockOf('.app-shell');

  test('AC1 — the app screens carry the tokens of the new identity (black ground, glass, mono)', () => {
    expect(scope).toMatch(/--color-ground:\s*#0/);
    expect(scope).toMatch(/--color-ink:\s*#fff/i);
    expect(scope).toMatch(/--color-muted:\s*rgba?\(/);
    expect(scope).toMatch(/--font-sans:[^;]*var\(--font-sora\)/);
    expect(scope).toMatch(/--font-mono:[^;]*var\(--font-jetbrains\)/);
    // No white surface is left in the app scope.
    const ground = over(token(scope, '--color-ground'), { r: 255, g: 255, b: 255 });
    const surface = over(token(scope, '--color-surface'), ground);
    expect(luminance(surface)).toBeLessThan(0.05);
  });

  test('AC2 — the app palette passes AA (4.5:1) for the body and the secondary text', () => {
    const ground = over(token(scope, '--color-ground'), { r: 255, g: 255, b: 255 });
    const ink = over(token(scope, '--color-ink'), ground);
    const muted = over(token(scope, '--color-muted'), ground);
    expect(contrast(ink, ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, ground)).toBeGreaterThanOrEqual(4.5);
  });

  test('AC3 — the dark ground is opt-in: /print and /login keep the light look', () => {
    const htmlRules = css.match(/^html[^{]*\{[^}]*\}/gm) ?? [];
    for (const rule of htmlRules) {
      const background = rule.match(/background:\s*([^;]+);/)?.[1] ?? '';
      if (/#[0-9a-f]{3,6}\b|black/i.test(background)) expect(rule).toMatch(/app-shell/);
    }
    expect(printCss).toMatch(/\.sheet\s*\{[^}]*background:\s*#fff/);
  });

  test('AC1 — no rule uppercases a field the user types in or compares', () => {
    const uppercaseRules = css.match(/[^{}]*\{[^}]*text-transform:\s*uppercase[^}]*\}/g) ?? [];
    expect(uppercaseRules.length).toBeGreaterThan(0);
    for (const rule of uppercaseRules) {
      const selector = rule.slice(0, rule.indexOf('{'));
      expect(selector).not.toMatch(/\b(input|select|textarea)\b/);
    }
  });

  test('AC3 — the map tiles are dark in the app screens', () => {
    expect(css).toMatch(/\.app-shell \.leaflet-tile-pane\s*\{[^}]*filter:/);
  });

  test('AC8 — the native popups of the app screens are dark', () => {
    // The date/time picker and the select list are drawn by the browser: they follow the
    // color-scheme of the box they open in.
    expect(scope).toMatch(/color-scheme:\s*dark/);
    // /print and /login live outside .app-shell: they keep the light scheme.
    expect(printCss).not.toContain('color-scheme');
    expect(css).not.toMatch(/^html\s*\{[^}]*color-scheme/m);
  });

  test('AC8 — the picker icon of the dark app stays visible', () => {
    // With color-scheme: dark the browser draws the calendar icon light: inverting it would hide it.
    const rule = css.match(/\.app-shell input\[type='date'\][^{]*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).not.toMatch(/filter:\s*invert/);
  });
});

describe('login hero motion (GMD-3)', () => {
  test('AC14 — the stagger of the panel has one rule per child', () => {
    // The panel has four children (chip, title, tagline and the form).
    const rules = css.match(/\.hero__panel\s*>\s*:nth-child\(\d+\)\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBe(4);
  });
});

describe('app icon', () => {
  test('AC-visual — the app ships an icon, so the browser stops asking for /favicon.ico', () => {
    expect(existsSync(fileURLToPath(new URL('./icon.svg', import.meta.url)))).toBe(true);
  });
});
