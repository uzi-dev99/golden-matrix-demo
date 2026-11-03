import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LoginPage from './login/page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

const css = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');
const printCss = readFileSync(fileURLToPath(new URL('./print/print.css', import.meta.url)), 'utf8');

/** The element children of the first element with `class="className"` in a rendered markup. */
function elementChildren(html: string, className: string): number {
  const start = html.indexOf(`class="${className}"`);
  if (start < 0) throw new Error(`no element with class ${className}`);
  const tag = /<(\/?)([a-z][a-z0-9]*)([^>]*)>/gi;
  tag.lastIndex = html.indexOf('>', start) + 1;
  // The scan starts inside the element: its own tag is depth 1 and the walk stops at its closing
  // tag, so a sibling that comes later is never counted as a child.
  let depth = 1;
  let count = 0;
  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    if (match[1] === '/') {
      depth--;
      if (depth === 0) break;
      continue;
    }
    if (/\/\s*$/.test(match[3])) {
      if (depth === 1) count++;
      continue;
    }
    if (depth === 1) count++;
    depth++;
  }
  return count;
}

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

  test('AC3 — the panels of the app use the glass of the home: translucent fill, blur and a subtle border', () => {
    const rule = css.match(/\.app-shell \.panel\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    // A translucent fill, so the background shows through.
    expect(rule).toMatch(/background:\s*rgba\(255, 255, 255, 0\.\d+\)/);
    // The blur of the home, with the saturation that keeps the colours alive.
    expect(rule).toMatch(/backdrop-filter:\s*blur\([^)]*\)\s*saturate\(/);
    expect(rule).toMatch(/border:\s*1px solid/);
  });

  test('AC1 — the app screens share the media of the hero: fixed behind the content, no pointer events', () => {
    const rule = css.match(/\.app-shell \.hero__media--ambient\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).toMatch(/position:\s*fixed/);
    expect(rule).toMatch(/inset:\s*0/);
    // Dimmed, and it never eats the clicks of the app.
    expect(rule).toMatch(/opacity:\s*0?\.\d+/);
    expect(rule).toMatch(/pointer-events:\s*none/);
    // The dark overlay that keeps the text legible over any frame.
    const scrim = css.match(/\.app-shell \.hero__media--ambient::after\s*\{[^}]*\}/)?.[0] ?? '';
    expect(scrim).not.toBe('');
    expect(scrim).toMatch(/background:\s*rgba\(/);
  });

  test('AC3 — the ambient background keeps the body text at AA over the worst frame of the poster', () => {
    const rule = css.match(/\.app-shell \.hero__media--ambient\s*\{[^}]*\}/)?.[0] ?? '';
    const scrimText = css.match(/\.app-shell \.hero__media--ambient::after\s*\{[^}]*background:\s*([^;]+);/)?.[1] ?? '';
    const opacity = Number(rule.match(/opacity:\s*([\d.]+)/)?.[1]);
    expect(opacity).toBeGreaterThan(0);
    const ground = over(token(scope, '--color-ground'), { r: 255, g: 255, b: 255 });
    // Worst case: the poster at full brightness (white) under the scrim, the media layer at its
    // opacity over the app ground, and the glass of the panel on top of that.
    const media = over(paint(scrimText), { r: 255, g: 255, b: 255 });
    const base = over({ ...media, a: opacity }, ground);
    const panel = over(paint('rgba(255, 255, 255, 0.04)'), base);
    const muted = over(token(scope, '--color-muted'), panel);
    expect(contrast(muted, panel)).toBeGreaterThanOrEqual(4.5);
  });

  test('AC8 — the picker icon of the dark app stays visible', () => {
    // With color-scheme: dark the browser draws the calendar icon light: inverting it would hide it.
    const rule = css.match(/\.app-shell input\[type='date'\][^{]*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).not.toMatch(/filter:\s*invert/);
  });
});

describe('login hero motion (GMD-3)', () => {
  test('AC14 — the child counter stops at the panel: a sibling that comes later is not a child', () => {
    const markup =
      '<div class="hero__panel"><p>a</p><p>b</p><p>c</p></div><div class="after"><a href="#">x</a></div>';
    expect(elementChildren(markup, 'hero__panel')).toBe(3);
  });

  test('AC14 — the stagger of the panel has one rule per rendered child', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    vi.unstubAllEnvs();
    // The panel has seven children (the chip, the title, the tagline and the form, a fragment of
    // four blocks): the rules must be exactly one per rendered child, and no dead one.
    const children = elementChildren(html, 'hero__panel');
    const rules = css.match(/\.hero__panel\s*>\s*:nth-child\(\d+\)\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBe(children);
  });
});

describe('app icon', () => {
  test('AC-visual — the app ships an icon, so the browser stops asking for /favicon.ico', () => {
    expect(existsSync(fileURLToPath(new URL('./icon.svg', import.meta.url)))).toBe(true);
  });
});
