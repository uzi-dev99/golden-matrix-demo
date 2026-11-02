import { describe, expect, test } from 'vitest';
import { calculateNatalChart } from '@/lib/natal';
import { ASPECT_COLOR, ASPECT_COLOR_DARK, chartToFormedAspects, chartToRadixData } from './to-astrochart';

const chart = calculateNatalChart({
  name: 'Persona de prueba', date: '1990-05-17', time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
});

/** The panel behind the wheel on the app screens: the ground plus the glass panel. */
const WHEEL_BACKGROUND = '#0f0f10';

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

function contrast(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('astrochart bridge', () => {
  test('AC9 — 10 planets + 2 nodes and 12 cusps in house order', () => {
    const d = chartToRadixData(chart);
    expect(Object.keys(d.planets).sort()).toEqual(['Jupiter', 'Mars', 'Mercury', 'Moon', 'NNode', 'Neptune', 'Pluto', 'SNode', 'Saturn', 'Sun', 'Uranus', 'Venus']);
    expect(d.cusps).toHaveLength(12);
    expect(d.cusps[0]).toBe(chart.houses[0].absoluteDegree);
    expect(d.planets.Sun).toEqual([chart.sun?.absoluteDegree]);
  });
  test('AC9 — every chart aspect maps to a drawable aspect with positions', () => {
    const a = chartToFormedAspects(chart);
    expect(a).toHaveLength(chart.aspects.length);
    for (const f of a) {
      expect(Number.isFinite(f.point.position) && Number.isFinite(f.toPoint.position)).toBe(true);
      expect(f.aspect.color).toMatch(/^#/);
    }
  });
  test('AC3 — the light wheel keeps the print colours byte for byte', () => {
    expect(ASPECT_COLOR).toEqual({
      conjunction: '#0b0d10',
      opposition: '#8c5d12',
      square: '#8c5d12',
      trine: '#8a929c',
      sextile: '#8a929c',
    });
    expect(chartToFormedAspects(chart, 'light')).toEqual(chartToFormedAspects(chart));
  });
  test('AC3 — on the dark wheel every aspect reads on the panel (3:1)', () => {
    for (const [name, color] of Object.entries(ASPECT_COLOR_DARK)) {
      expect(contrast(color, WHEEL_BACKGROUND), `${name} on the dark wheel`).toBeGreaterThanOrEqual(3);
    }
    expect(chartToFormedAspects(chart, 'dark').map((a) => a.aspect.color)).not.toEqual(
      chartToFormedAspects(chart).map((a) => a.aspect.color),
    );
  });
});
