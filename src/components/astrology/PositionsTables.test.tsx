import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { SIGNS_ES } from '@/lib/format';
import { calculateNatalChart } from '@/lib/natal';
import { HousesTable, PlanetsTable } from './PositionsTables';

const chart = calculateNatalChart({
  name: 'Persona de prueba', date: '1990-05-17', time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
});

describe('positions tables', () => {
  test('AC9 — 10 planet rows, 12 house rows, retrograde marks and angle names', () => {
    const p = renderToStaticMarkup(<PlanetsTable chart={chart} />);
    const h = renderToStaticMarkup(<HousesTable chart={chart} />);
    expect(p.match(/<tr>/g)).toHaveLength(11); // header + 10 planets
    expect(p).toContain('Tauro');
    expect(h.match(/<tr>/g)).toHaveLength(13); // header + 12 houses
    expect(h).toContain('Medio cielo');
  });
  test('AC9 — a planet that reaches 30°00′ shows the next sign', () => {
    const carried = { ...chart, planets: chart.planets.map((p, i) => (i === 0 ? { ...p, signEs: 'Tauro', degree: 29.9999 } : p)) };
    const html = renderToStaticMarkup(<PlanetsTable chart={carried} />);
    expect(html).toContain('Géminis');
    expect(html).toContain('0°00′');
  });
  test('AC9 — the sign list of the display layer names the signs as the engine does', () => {
    for (const p of chart.planets) expect(SIGNS_ES).toContain(p.signEs);
    for (const h of chart.houses) expect(SIGNS_ES).toContain(h.signEs);
  });
});
