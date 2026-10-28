import { describe, expect, test } from 'vitest';
import type { BirthInput } from '@/lib/types';
import { calculateNatalChart } from './calculate';

/**
 * Invariants of the house system, independent of any reference ephemeris:
 * the cusps walk the circle strictly in order (every house spans more than 0°
 * and less than 180°) and the planets do not all fall in the same house — a
 * wrapped cusp 2 used to put every planet in house 1.
 */
const CASES: BirthInput[] = [
  { name: 'Madrid (F4 case)', date: '1990-05-14', time: '10:30', place: { label: 'Madrid', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' } },
  { name: 'Madrid', date: '1990-05-17', time: '14:30', place: { label: 'Madrid', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' } },
  { name: 'Buenos Aires', date: '1985-11-03', time: '06:15', place: { label: 'Buenos Aires', latitude: -34.6037, longitude: -58.3816, timezone: 'America/Argentina/Buenos_Aires' } },
  { name: 'lat 60 N', date: '2001-06-15', time: '12:00', place: { label: '60 N', latitude: 60, longitude: 10, timezone: 'UTC' } },
  { name: 'lat 60 S', date: '1995-03-03', time: '03:03', place: { label: '60 S', latitude: -60, longitude: -70, timezone: 'UTC' } },
  { name: 'Ushuaia', date: '1992-02-29', time: '05:05', place: { label: 'Ushuaia', latitude: -54.8, longitude: -68.3, timezone: 'UTC' } },
  { name: 'Caracas', date: '1975-07-04', time: '18:45', place: { label: 'Caracas', latitude: 12.5, longitude: -60, timezone: 'UTC' } },
  { name: 'Sydney', date: '2020-01-01', time: '00:00', place: { label: 'Sydney', latitude: -33.9, longitude: 151.2, timezone: 'UTC' } },
];

/** Length in degrees of the arc that goes from `from` to `to` in the zodiac order. */
function arc(from: number, to: number): number {
  return (to - from + 360) % 360;
}

describe('house invariants', () => {
  for (const input of CASES) {
    test(`${input.name} — the cusps go around the circle in order and the planets spread`, () => {
      const chart = calculateNatalChart(input);
      const cusps = chart.houses.map((h) => h.absoluteDegree);

      const arcs = cusps.map((cusp, i) => arc(cusp, cusps[(i + 1) % cusps.length]));
      expect(Math.min(...arcs)).toBeGreaterThan(0);
      expect(Math.max(...arcs)).toBeLessThan(180);

      const occupied = new Set(chart.planets.map((p) => p.house));
      expect(occupied.size).toBeGreaterThan(1);
    });
  }
});
