import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { madridChart } from '@/components/shell/chart-fixture.test-utils';
import { NatalWheel } from './NatalWheel';

describe('NatalWheel', () => {
  test('AC9 — the wheel scales with its container instead of a fixed pixel width', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    // The drawing box caps the width; the svg follows the container (a 390 px screen fits).
    expect(html).toContain('max-width:480px');
    const classes = html.replaceAll('&amp;', '&').replaceAll('&gt;', '>');
    expect(classes).toContain('[&>svg]:w-full');
    expect(classes).toContain('[&>svg]:h-auto');
  });

  test('AC9 — the wheel keeps its square shape', () => {
    const html = renderToStaticMarkup(<NatalWheel chart={madridChart} size={480} />);
    expect(html).toContain('aspect-square');
  });
});
