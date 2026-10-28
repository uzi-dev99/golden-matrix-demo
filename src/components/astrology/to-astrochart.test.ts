import { describe, expect, test } from 'vitest';
import { calculateNatalChart } from '@/lib/natal';
import { chartToFormedAspects, chartToRadixData } from './to-astrochart';

const chart = calculateNatalChart({
  name: 'Persona de prueba', date: '1990-05-17', time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
});

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
});
