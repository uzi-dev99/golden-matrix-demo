import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import LoginPage from './page';

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

  test('AC1 — the hero is the video, the nav and the legal line, with Astrolabio branding', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain(VIDEO_URL);
    expect(html).toContain(POSTER_URL);
    expect(html).toContain('<nav');
    expect(html).toContain('Astrolabio');
    expect(html).toContain('aviso de privacidad');
    expect(html).not.toContain('ECHOID');
    expect(html).not.toContain('E network');
    vi.unstubAllEnvs();
  });
});
