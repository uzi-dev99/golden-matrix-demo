import { describe, expect, test } from 'vitest';
import type { BirthInput } from '@/lib/types';
import { calculateNatalChart } from './calculate';

const madrid: BirthInput = {
  name: 'Persona de prueba',
  date: '1990-05-17',
  time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
};

describe('calculateNatalChart', () => {
  test('AC4 — shape: 10 planets, 12 houses, angles, nodes', () => {
    const c = calculateNatalChart(madrid);
    expect(c.planets).toHaveLength(10);
    expect(c.houses.map((h) => h.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(c.sun?.signEs).toBe('Tauro'); // 17 May: Sun in Taurus (26° Taurus-ish)
    expect(c.utcInstant).toBe('1990-05-17T12:30:00.000Z'); // CEST = UTC+2
    expect(c.nodes.southNode.absoluteDegree).toBeCloseTo((c.nodes.northNode.absoluteDegree + 180) % 360, 5);
  });
  test('AC4 — deterministic (no clock)', () => {
    expect(calculateNatalChart(madrid)).toEqual(calculateNatalChart(madrid));
  });
  test('AC4 — missing timezone and impossible date throw', () => {
    expect(() => calculateNatalChart({ ...madrid, place: { ...madrid.place, timezone: '' } })).toThrow(/timezone/);
    // luxon moves a time inside a spring-forward gap (2024-03-31 02:30 Europe/Madrid) instead of failing
    expect(() => calculateNatalChart({ ...madrid, date: '2024-03-31', time: '02:30' })).not.toThrow();
    expect(() => calculateNatalChart({ ...madrid, date: '2024-02-31' })).toThrow(/Invalid birth moment/);
  });
  test('AC4 — polar latitude falls back to Porphyry with a warning', () => {
    const c = calculateNatalChart({ ...madrid, place: { ...madrid.place, latitude: 69.65, longitude: 18.96, timezone: 'Europe/Oslo', label: 'Tromsø, Noruega' } });
    expect(c.warnings.join(' ')).toMatch(/Porphyry/);
  });
});
