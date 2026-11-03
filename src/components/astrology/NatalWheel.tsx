'use client';

import { useEffect, useId, useRef } from 'react';
import type { Settings } from '@astrodraw/astrochart';
import type { NatalChart } from '@/lib/types';
import { chartToFormedAspects, chartToRadixData, type WheelTheme } from './to-astrochart';

export type { WheelTheme };

/** The print sheet is white paper; the app screens are black (GMD-2). */
export const DEFAULT_WHEEL_THEME: WheelTheme = 'light';

/** The pointer tilt never goes past this: the glyphs and the house numbers have to stay readable. */
export const MAX_TILT_DEG = 12;

/**
 * The depth layers of the wheel (VK-526). Chrome flattens what is inside an SVG, so a translateZ
 * on a group of the drawing would do nothing: every ring becomes its own <svg> stacked on the
 * base one, and the browser gives them a real depth. The aspects stay in the base plane, on z=0.
 */
export const WHEEL_LAYERS = [
  { name: 'signs', groups: ['-radix-signs'] },
  { name: 'houses', groups: ['-radix-cusps', '-radix-axis'] },
  { name: 'planets', groups: ['-radix-planets'] },
] as const;

/** The tilt of the wheel for a pointer offset in [-1, 1]: the offset is clamped first. */
export function tiltDegrees(offset: number): number {
  return Math.max(-1, Math.min(1, offset)) * MAX_TILT_DEG;
}

/** The wheel tilts only with a fine pointer on a hover-capable device, and never with reduced motion. */
export function tiltEnabled(env: { hover: boolean; fine: boolean; reducedMotion: boolean }): boolean {
  return env.hover && env.fine && !env.reducedMotion;
}

/**
 * The library positions the planets with an SVG `transform` attribute, and the motion layer grows
 * them with `transform-box: fill-box`: that origin also moves the attribute transform, and every
 * planet lands outside its ring. A wrapper with no transform of its own carries the animation, so
 * the planet keeps the place the library gave it.
 */
function wrapPlanets(svg: SVGSVGElement): void {
  for (const planet of [...svg.querySelectorAll<SVGGElement>('[id$="-radix-planets"] > g')]) {
    const wrapper = document.createElementNS(svg.namespaceURI, 'g');
    planet.replaceWith(wrapper);
    wrapper.appendChild(planet);
  }
}

/**
 * Moves the rings of the drawing into their own <svg>, stacked on the base one: that is what
 * gives them a depth in the browser. The groups keep their ids, so the motion layer still finds
 * the planets.
 */
function splitWheelLayers(holder: HTMLElement): void {
  const svg = holder.querySelector('svg');
  if (!svg) return;
  wrapPlanets(svg);
  for (const layer of WHEEL_LAYERS) {
    const groups = layer.groups
      .map((suffix) => svg.querySelector(`g[id$="${suffix}"]`))
      .filter((group): group is SVGGElement => group !== null);
    if (!groups.length) continue;
    const layerSvg = svg.cloneNode(false) as SVGSVGElement;
    layerSvg.setAttribute('class', 'wheel__layer');
    layerSvg.setAttribute('data-layer', layer.name);
    // The library draws the svg in the flow; the layers have to sit on top of it.
    layerSvg.style.position = 'absolute';
    for (const group of groups) layerSvg.appendChild(group);
    // In order: the back layer first, so the painting order follows the depth.
    holder.appendChild(layerSvg);
  }
}

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
      // The library merges the settings into its module defaults: set the house numbers explicitly.
      CUSPS_FONT_COLOR: '#000',
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
      // The house numbers 1-12: the library default is #000, invisible on the dark panel.
      CUSPS_FONT_COLOR: '#d8d8e0',
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
      paper.radix(chartToRadixData(chart)).aspects(chartToFormedAspects(chart, theme));
      // The print sheet stays the flat wheel of the library: only the app screens get the depth.
      if (theme === 'dark') splitWheelLayers(el);
      // The planets pop in one by one: the CSS reads the index of each symbol from --i.
      el.querySelectorAll<SVGGElement>('[id$="-radix-planets"] > g').forEach((g, i) => g.style.setProperty('--i', String(i)));
    })();
    return () => {
      cancelled = true;
      el.replaceChildren();
    };
  }, [chart, size, reactId, theme]);

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    if (!tiltEnabled({
      hover: window.matchMedia('(hover: hover)').matches,
      fine: window.matchMedia('(pointer: fine)').matches,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })) return;
    const onMove = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const x = ((event.clientX - box.left) / box.width) * 2 - 1;
      const y = ((event.clientY - box.top) / box.height) * 2 - 1;
      el.style.setProperty('--tilt-x', `${tiltDegrees(y)}deg`);
      el.style.setProperty('--tilt-y', `${tiltDegrees(-x)}deg`);
    };
    // The wheel faces the viewer again when the pointer leaves it.
    const onLeave = () => {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div
      className="wheel mx-auto aspect-square w-full [&_svg]:h-auto [&_svg]:w-full"
      style={{ maxWidth: size }}
      data-theme={theme}
    >
      <div
        id={`wheel-${reactId}`}
        ref={holder}
        role="img"
        aria-label={`Carta natal de ${chart.input.name}: Sol en ${chart.sun?.signEs}, Luna en ${chart.moon?.signEs}, Ascendente en ${chart.ascendant.signEs}`}
        className="wheel__tilt"
      />
    </div>
  );
}
