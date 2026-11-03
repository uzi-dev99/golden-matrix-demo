import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { madridChart } from '@/components/shell/chart-fixture.test-utils';
import { chartToFormedAspects } from './to-astrochart';
import { DEFAULT_WHEEL_THEME, NatalWheel, WHEEL_PALETTES } from './NatalWheel';

const source = readFileSync(fileURLToPath(new URL('./NatalWheel.tsx', import.meta.url)), 'utf8');

/** Relative luminance of a #rrggbb colour: the drawing colours are plain hex. */
function luminance(hex: string | undefined): number {
  if (!hex) throw new Error('the palette has no colour');
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

describe('NatalWheel', () => {
  test('AC9 — the wheel scales with its container instead of a fixed pixel width', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    // The drawing box caps the width; the svg follows the container (a 390 px screen fits).
    expect(html).toContain('max-width:480px');
    const classes = html.replaceAll('&amp;', '&').replaceAll('&gt;', '>');
    expect(classes).toContain('[&>svg]:w-full');
    expect(classes).toContain('[&>svg]:h-auto');
  });

  test('AC9 — the wheel keeps its square shape', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    expect(html).toContain('aspect-square');
  });

  test('AC3 — the wheel has a dark palette for the app screens and keeps the light one for the print', () => {
    // The print sheet is white paper: the default stays the light palette.
    expect(DEFAULT_WHEEL_THEME).toBe('light');
    expect(luminance(WHEEL_PALETTES.light.POINTS_COLOR)).toBeLessThan(0.2);
    // The app screens are black: the points and the signs are drawn in light ink.
    expect(luminance(WHEEL_PALETTES.dark.POINTS_COLOR)).toBeGreaterThan(0.5);
    expect(luminance(WHEEL_PALETTES.dark.SIGNS_COLOR)).toBeGreaterThan(0.5);
    expect(luminance(WHEEL_PALETTES.dark.SYMBOL_AXIS_FONT_COLOR)).toBeGreaterThan(0.5);
    // The house numbers 1-12 come from the library default (#000): on the dark wheel they were
    // invisible, so the dark palette sets them in light ink.
    expect(luminance(WHEEL_PALETTES.dark.CUSPS_FONT_COLOR)).toBeGreaterThan(0.4);
    // The light palette sets them too: the library merges the settings into its module-level
    // defaults, so a dark wheel drawn first would leak its colour into the next light one.
    expect(WHEEL_PALETTES.light.CUSPS_FONT_COLOR).toBe('#000');
  });

  test('AC10 — the light palette pins the house numbers to the library default: a dark wheel cannot leak its ink', () => {
    // The astrochart Chart constructor merges the settings into its module-level defaults, so the
    // light palette has to set the house numbers itself. With the library default the printed
    // wheel is byte-identical, and a dark wheel drawn first cannot leak its colour into it.
    const lib = readFileSync(
      fileURLToPath(new URL('../../../node_modules/@astrodraw/astrochart/dist/astrochart.js', import.meta.url)),
      'utf8',
    );
    expect(lib).toMatch(/CUSPS_FONT_COLOR:"#000"/);
    expect(WHEEL_PALETTES.light.CUSPS_FONT_COLOR).toBe('#000');
  });

  test('AC12 — the wheel passes its theme to the aspects', () => {
    // The drawing happens in the browser (no DOM test library here): the wiring is pinned in
    // the source, and the argument is what changes the colours.
    expect(source).toMatch(/chartToFormedAspects\(\s*chart,\s*theme\s*\)/);
    expect(chartToFormedAspects(madridChart)).not.toEqual(chartToFormedAspects(madridChart, 'dark'));
  });
});
