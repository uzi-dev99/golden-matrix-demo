import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NatalChart } from '@/lib/types';
import { madridChart } from '@/components/shell/chart-fixture.test-utils';
import LoginPage from './page';

// The real engine is unit u1; the page only needs a chart to draw.
vi.mock('@/lib/natal', () => ({ calculateNatalChart: () => madridChart as NatalChart }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

describe('login page', () => {
  test('AC9 — the demo credentials are printed on the page and the form is there', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    vi.stubEnv('DEMO_USER', 'demo');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain('demo');
    expect(html).toContain('astrolabio-demo');
    expect(html).toContain('Entrar a la demo');
    expect(html).toContain('Una carta natal');
    expect(html).toContain('Rellenar los campos');
    vi.unstubAllEnvs();
  });
});
