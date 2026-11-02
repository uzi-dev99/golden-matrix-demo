'use client';

import { useEffect, useId, useRef } from 'react';
import type { Settings } from '@astrodraw/astrochart';
import type { NatalChart } from '@/lib/types';
import { chartToFormedAspects, chartToRadixData } from './to-astrochart';

export type WheelTheme = 'light' | 'dark';

/** The print sheet is white paper; the app screens are black (GMD-2). */
export const DEFAULT_WHEEL_THEME: WheelTheme = 'light';

const SIGN_COLOR_KEYS = [
  'COLOR_ARIES',
  'COLOR_TAURUS',
  'COLOR_GEMINI',
  'COLOR_CANCER',
  'COLOR_LEO',
  'COLOR_VIRGO',
  'COLOR_LIBRA',
  'COLOR_SCORPIO',
  'COLOR_SAGITTARIUS',
  'COLOR_CAPRICORN',
  'COLOR_AQUARIUS',
  'COLOR_PISCES',
] as const;

/** One neutral tone for all twelve signs: the only hue in the product is brass. */
function withSignColors(base: Partial<Settings>, color: string): Partial<Settings> {
  const settings = { ...base };
  for (const key of SIGN_COLOR_KEYS) settings[key] = color;
  return settings;
}

export const WHEEL_PALETTES: Record<WheelTheme, Partial<Settings>> = {
  light: withSignColors(
    {
      COLOR_BACKGROUND: 'transparent',
      POINTS_COLOR: '#0b0d10',
      SIGNS_COLOR: '#0b0d10',
      CIRCLE_COLOR: '#8a929c',
      LINE_COLOR: '#8a929c',
      SYMBOL_AXIS_FONT_COLOR: '#0b0d10',
      SYMBOL_SCALE: 0.9,
    },
    '#e7eaee',
  ),
  dark: withSignColors(
    {
      COLOR_BACKGROUND: 'transparent',
      POINTS_COLOR: '#ffffff',
      SIGNS_COLOR: '#ffffff',
      CIRCLE_COLOR: 'rgba(255, 255, 255, 0.32)',
      LINE_COLOR: 'rgba(255, 255, 255, 0.32)',
      SYMBOL_AXIS_FONT_COLOR: '#ffffff',
      SYMBOL_SCALE: 0.9,
    },
    '#16161c',
  ),
};

/** Natal wheel. The library draws into a DOM node by id, so it only runs in the browser. */
export function NatalWheel({
  chart,
  size = 560,
  theme = DEFAULT_WHEEL_THEME,
}: {
  chart: NatalChart;
  size?: number;
  theme?: WheelTheme;
}) {
  const reactId = useId().replace(/:/g, '');
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const el = holder.current;
    if (!el) return;
    (async () => {
      const { Chart } = await import('@astrodraw/astrochart');
      if (cancelled) return;
      el.replaceChildren(); // StrictMode runs the effect twice; draw once
      const paper = new Chart(`wheel-${reactId}`, size, size, WHEEL_PALETTES[theme]);
      paper.radix(chartToRadixData(chart)).aspects(chartToFormedAspects(chart));
    })();
    return () => {
      cancelled = true;
      el.replaceChildren();
    };
  }, [chart, size, reactId, theme]);

  return (
    <div
      id={`wheel-${reactId}`}
      ref={holder}
      role="img"
      aria-label={`Carta natal de ${chart.input.name}: Sol en ${chart.sun?.signEs}, Luna en ${chart.moon?.signEs}, Ascendente en ${chart.ascendant.signEs}`}
      className="mx-auto aspect-square w-full [&>svg]:h-auto [&>svg]:w-full"
      style={{ maxWidth: size }}
    />
  );
}
