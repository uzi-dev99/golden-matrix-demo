import { describe, expect, test } from 'vitest';
import type { NatalChart } from '@/lib/types';
import { buildPages } from './pages';

const chart = {} as NatalChart;

describe('buildPages', () => {
  test('AC14 — nothing stored means no pages', () => {
    expect(buildPages({})).toEqual([]);
  });
  test('AC14 — chart only: cover + positions, no report pages', () => {
    expect(buildPages({ chart }).map((p) => p.kind)).toEqual(['cover', 'positions']);
  });
  test('AC13 — every report section gets its own page', () => {
    const pages = buildPages({ chart, report: '## Uno\na\n## Dos\nb' });
    expect(pages.map((p) => p.kind)).toEqual(['cover', 'positions', 'section', 'section']);
  });
});
