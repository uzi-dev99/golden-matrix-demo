import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(new URL('./LocationMap.tsx', import.meta.url), 'utf8');

describe('LocationMap', () => {
  test('AC9 — leaflet is only imported dynamically (it touches window)', () => {
    expect(source).not.toMatch(/^\s*import\s+(?!type\b)[^;]*from\s+['"]leaflet['"]/m);
    expect(source).toMatch(/import\('leaflet'\)/);
  });
});
