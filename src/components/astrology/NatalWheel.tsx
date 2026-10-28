'use client';

import { useEffect, useId, useRef } from 'react';
import type { NatalChart } from '@/lib/types';
import { chartToFormedAspects, chartToRadixData } from './to-astrochart';

/** Natal wheel. The library draws into a DOM node by id, so it only runs in the browser. */
export function NatalWheel({ chart, size = 560 }: { chart: NatalChart; size?: number }) {
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
      const paper = new Chart(`wheel-${reactId}`, size, size, {
        COLOR_BACKGROUND: 'transparent',
        POINTS_COLOR: '#0b0d10',
        SIGNS_COLOR: '#0b0d10',
        CIRCLE_COLOR: '#8a929c',
        LINE_COLOR: '#8a929c',
        SYMBOL_AXIS_FONT_COLOR: '#0b0d10',
        // one neutral tone for all twelve signs: the only hue in the product is brass
        COLOR_ARIES: '#e7eaee',
        COLOR_TAURUS: '#e7eaee',
        COLOR_GEMINI: '#e7eaee',
        COLOR_CANCER: '#e7eaee',
        COLOR_LEO: '#e7eaee',
        COLOR_VIRGO: '#e7eaee',
        COLOR_LIBRA: '#e7eaee',
        COLOR_SCORPIO: '#e7eaee',
        COLOR_SAGITTARIUS: '#e7eaee',
        COLOR_CAPRICORN: '#e7eaee',
        COLOR_AQUARIUS: '#e7eaee',
        COLOR_PISCES: '#e7eaee',
        SYMBOL_SCALE: 0.9,
      });
      paper.radix(chartToRadixData(chart)).aspects(chartToFormedAspects(chart));
    })();
    return () => {
      cancelled = true;
      el.replaceChildren();
    };
  }, [chart, size, reactId]);

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
