import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { madridChart, madridInput } from './chart-fixture.test-utils';
import { ResultsView } from './ResultsView';

describe('ResultsView', () => {
  test('AC9 — the chart summary, both position tables and the report panel are on the page', () => {
    const html = renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />);
    expect(html).toContain('Tauro');
    expect(html).toContain('Planetas de la carta natal');
    expect(html).toContain('Cúspides de las casas (Placidus)');
    expect(html).toContain('Prompt que recibirá el modelo');
    expect(html).toContain('>Informe<');
  });

  test('AC9 — all 12 houses are rendered and the chart column is not sticky (it is taller than the screen)', () => {
    const html = renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />);
    const houses = html.slice(html.indexOf('Cúspides de las casas'));
    expect(houses.match(/<tr>/g)?.length).toBe(13);
    expect(html).not.toContain('sticky');
  });

  test('AC9 — the positions panel is a tablist with the two tables', () => {
    const html = renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Planetas');
    expect(html).toContain('Casas');
  });

  test('AC-visual — the three figures stack on narrow screens and the tables scroll instead of touching', () => {
    const html = renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />);
    expect(html).toContain('grid-cols-1');
    expect(html).toContain('sm:grid-cols-3');
    expect(html).toContain('overflow-x-auto');
  });

  test('AC9 — the title shows the person, the date, the time and the place', () => {
    const html = renderToStaticMarkup(<ResultsView input={madridInput} chart={madridChart} />);
    expect(html).toContain('Elena Prueba');
    expect(html).toContain('17 may 1990');
    expect(html).toContain('14:30');
    expect(html).toContain('Madrid, España');
  });
});
