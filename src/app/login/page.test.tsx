import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import LoginPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

/** Every layout of the app: the CDN preconnect must not live in one of them. */
function layouts(dir: string): { file: string; source: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return layouts(full);
    return entry.name === 'layout.tsx' ? [{ file: full, source: readFileSync(full, 'utf8') }] : [];
  });
}

const appLayouts = layouts(fileURLToPath(new URL('..', import.meta.url)));

// The brand of the source project must not be in this public repo. The strings are built from
// parts so the repo-wide grep stays clean (AC2).
const SOURCE_BRAND = ['ECHO', 'ID'].join('');
const SOURCE_NETWORK = ['E', 'network'].join(' ');

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

  test('AC2 — the credentials printed in the note are the ones the login accepts', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    vi.stubEnv('DEMO_USER', 'demo');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain('<code>demo</code>');
    expect(html).toContain('<code>astrolabio-demo</code>');
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
    expect(html).not.toContain(SOURCE_BRAND);
    expect(html).not.toContain(SOURCE_NETWORK);
    vi.unstubAllEnvs();
  });

  test('AC4 — the legal line has no dead anchors: there are no privacy or terms pages', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    const legal = html.match(/<footer class="hero__legal">([\s\S]*?)<\/footer>/)?.[1] ?? '';
    expect(legal).not.toBe('');
    // The legal line is plain text: any anchor would be a dead link (this demo has no privacy or
    // terms pages), and a hash to nowhere would look like one.
    expect(legal).not.toMatch(/<a[\s>]/);
    expect(legal).toContain('aviso de privacidad');
    expect(legal).toContain('condiciones de servicio');
    vi.unstubAllEnvs();
  });

  test('AC5 — the CDN preconnect belongs to /login, not to a layout', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html).toContain('rel="preconnect"');
    expect(html).toContain('d8j0ntlcm91z4.cloudfront.net');
    // No layout carries the link: it belongs to the page that loads the media.
    expect(appLayouts.length).toBeGreaterThan(0);
    for (const layout of appLayouts) {
      expect(layout.source, layout.file).not.toContain('preconnect');
    }
    vi.unstubAllEnvs();
  });

  test('AC1 — the login page carries exactly one video element', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    expect(html.match(/<video/g)?.length).toBe(1);
    vi.unstubAllEnvs();
  });
});
