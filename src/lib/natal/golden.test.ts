import { describe, expect, test } from 'vitest';
import type { BirthInput, PlanetKey } from '@/lib/types';
import { calculateNatalChart } from './calculate';
import { buenosAires, j2000, madrid, tromso } from './fixtures';

interface Golden {
  planets: Record<PlanetKey, number>;
  ascendant: number;
  midheaven: number;
  northNode: number;
  cusps: number[];
}

/** Smallest absolute difference between two ecliptic longitudes, in degrees. */
function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Absolute longitudes (degrees). The planets/angles come from the ported engine and were
 * cross-checked by hand (D13); the cusps are the Swiss Ephemeris reference (pyswisseph,
 * house system 'P' — 'O' for Tromsø, where Placidus does not converge) and are compared
 * with a ±0.02° tolerance (Swiss Ephemeris values rounded to 0.01°).
 */
const GOLDEN: Record<string, Golden> = {
  madrid: {
    planets: {
      sun: 56.34, moon: 322.7, mercury: 37.92, venus: 15.13, mars: 349.83,
      jupiter: 99.93, saturn: 295.21, uranus: 279.13, neptune: 284.32, pluto: 226.11,
    },
    ascendant: 155.2,
    midheaven: 60.89,
    northNode: 311.23,
    cusps: [155.2032, 178.9017, 207.6541, 240.8885, 275.4407, 307.3364, 335.2032, 358.9017, 27.6541, 60.8885, 95.4407, 127.3364],
  },
  buenosAires: {
    planets: {
      sun: 220.9, moon: 102.51, mercury: 243.33, venus: 202.19, mars: 184.23,
      jupiter: 308.67, saturn: 238.39, uranus: 256.05, neptune: 271.57, pluto: 214.93,
    },
    ascendant: 227.66,
    midheaven: 120.73,
    northNode: 38.93,
    cusps: [227.6662, 255.347, 277.9724, 300.7335, 327.906, 4.0079, 47.6662, 75.347, 97.9724, 120.7335, 147.906, 184.0079],
  },
  tromso: {
    planets: {
      sun: 270.15, moon: 350.13, mercury: 279.71, venus: 264.52, mars: 339.52,
      jupiter: 102.01, saturn: 70.02, uranus: 322.02, neptune: 307.11, pluto: 255.67,
    },
    ascendant: 181.02,
    midheaven: 91.86,
    northNode: 86.89,
    // Porphyry (Swiss Ephemeris 'O'): Placidus does not converge above 66° of latitude.
    cusps: [181.0164, 211.2962, 241.576, 271.8558, 301.576, 331.2962, 1.0164, 31.2962, 61.576, 91.8558, 121.576, 151.2962],
  },
  j2000: {
    planets: {
      sun: 280.37, moon: 223.32, mercury: 271.89, venus: 241.57, mars: 327.96,
      jupiter: 25.25, saturn: 40.4, uranus: 314.81, neptune: 303.2, pluto: 251.45,
    },
    ascendant: 11.37,
    midheaven: 279.61,
    northNode: 125.04,
    cusps: [11.3739, 42.9066, 71.9609, 99.6111, 128.0405, 158.8494, 191.3739, 222.9066, 251.9609, 279.6111, 308.0405, 338.8494],
  },
};

function expectGolden(input: BirthInput, golden: Golden): void {
  const chart = calculateNatalChart(input);
  for (const planet of chart.planets) {
    expect(planet.absoluteDegree).toBeCloseTo(golden.planets[planet.key], 2);
  }
  expect(chart.ascendant.absoluteDegree).toBeCloseTo(golden.ascendant, 2);
  expect(chart.midheaven.absoluteDegree).toBeCloseTo(golden.midheaven, 2);
  expect(chart.nodes.northNode.absoluteDegree).toBeCloseTo(golden.northNode, 2);
  chart.houses.forEach((house, i) =>
    expect(angularDistance(house.absoluteDegree, golden.cusps[i])).toBeLessThanOrEqual(0.02)
  );
}

describe('golden fixtures', () => {
  test('S4.1 — madrid', () => {
    expectGolden(madrid, GOLDEN.madrid);
    // Cross-check: on 17 May the Sun is in Taurus, 26°-27°.
    const sun = calculateNatalChart(madrid).sun;
    expect(sun?.signEs).toBe('Tauro');
    expect(sun?.degree).toBeGreaterThan(26);
    expect(sun?.degree).toBeLessThan(27);
  });
  test('S4.2 — buenosAires', () => {
    expectGolden(buenosAires, GOLDEN.buenosAires);
  });
  test('S4.3 — tromso (Porphyry)', () => {
    expectGolden(tromso, GOLDEN.tromso);
    expect(calculateNatalChart(tromso).warnings.join(' ')).toMatch(/Porphyry/);
  });
  test('S4.4 — J2000 Sun', () => {
    expectGolden(j2000, GOLDEN.j2000);
    // Cross-check: the Sun at 2000-01-01T12:00Z is at 280.37° (10° of Capricorn).
    const sun = calculateNatalChart(j2000).sun;
    expect(sun?.absoluteDegree).toBeGreaterThan(280.27);
    expect(sun?.absoluteDegree).toBeLessThan(280.47);
  });
});
