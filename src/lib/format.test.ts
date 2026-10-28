import { describe, expect, test } from 'vitest';
import { formatDate, formatDegree, signAndDegree } from './format';

describe('format', () => {
  test('AC9 — degrees carry minutes instead of printing 60', () => {
    expect(formatDegree(26.34)).toBe('26°20′');
    expect(formatDegree(6.9999)).toBe('7°00′');
    expect(formatDegree(0)).toBe('0°00′');
  });
  test('AC9 — a degree that reaches 30° is normalised to 0°00′ of the next sign', () => {
    expect(formatDegree(29.9999)).toBe('0°00′');
    expect(formatDegree(30)).toBe('0°00′');
    expect(formatDegree(29.5)).toBe('29°30′');
  });
  test('AC9 — the sign is carried with the degree: 29.9999° Tauro is 0°00′ Géminis', () => {
    expect(signAndDegree('Tauro', 29.9999)).toEqual({ sign: 'Géminis', degree: 0 });
    expect(formatDegree(signAndDegree('Tauro', 29.9999).degree)).toBe('0°00′');
    expect(signAndDegree('Piscis', 30)).toEqual({ sign: 'Aries', degree: 0 });
    expect(signAndDegree('Tauro', 26.34)).toEqual({ sign: 'Tauro', degree: 26.34 });
  });
  test('AC9 — dates are formatted from the string, never through a timezone', () => {
    expect(formatDate('1990-05-17')).toBe('17 may 1990');
  });
});
