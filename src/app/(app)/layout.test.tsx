import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AppLayout from './layout';

vi.mock('next/headers', () => ({ cookies: async () => new Map() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

describe('app layout', () => {
  test('AC1 — the app screens share the media of the login hero: one video behind the content', async () => {
    vi.stubEnv('SESSION_SECRET', 'a'.repeat(32));
    const html = renderToStaticMarkup(await AppLayout({ children: <p>contenido</p> }));
    vi.unstubAllEnvs();
    // One video element per page: the app pages get it from the layout, not from each page.
    expect(html.match(/<video/g)?.length).toBe(1);
    expect(html).toContain('hero__media--ambient');
    // The content sits above the background: its wrapper carries the stacking context, not the
    // media (a bare "z-10" substring would also match any other element's class).
    expect(html).toMatch(/<div class="(?=[^"]*\bmx-auto\b)(?=[^"]*\brelative\b)(?=[^"]*\bz-10\b)[^"]*">/);
  });

  test('AC1 — the app pages do not bring a second video: the layout brings the only one', () => {
    for (const page of ['page.tsx', 'resultado/page.tsx']) {
      const source = readFileSync(fileURLToPath(new URL(`./${page}`, import.meta.url)), 'utf8');
      expect(source).not.toContain('<video');
    }
  });
});
