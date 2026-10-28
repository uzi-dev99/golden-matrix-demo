import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { NatalChart, StoredSession } from '@/lib/types';
import { PrintDocument } from './PrintDocument';

const chart = {
  input: {
    name: 'Ana',
    date: '1990-05-17',
    time: '14:30',
    place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
  },
  sun: { signEs: 'Tauro', degree: 26.3 },
  moon: { signEs: 'Acuario', degree: 23.1 },
  ascendant: { signEs: 'Virgo', degree: 5.2 },
  midheaven: { signEs: 'Leo', degree: 12.4 },
  planets: [],
  houses: [],
  warnings: [],
} as unknown as NatalChart;

const session: StoredSession = {
  input: chart.input,
  chart,
  report: '## Uno\ntexto uno\n## Dos\ntexto dos',
};

describe('PrintDocument', () => {
  test('AC13 — one sheet per page: cover, positions and a sheet per report section', () => {
    const html = renderToStaticMarkup(<PrintDocument session={session} />);
    expect(html.match(/class="sheet"/g)).toHaveLength(4);
    expect(html).toContain('Ana');
    expect(html).toContain('Uno');
    expect(html).toContain('Dos');
  });
  test('AC14 — without a chart there is no document', () => {
    expect(renderToStaticMarkup(<PrintDocument session={{}} />)).toBe('');
  });
});
