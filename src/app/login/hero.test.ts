import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import LoginPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

const css = readFileSync(fileURLToPath(new URL('../globals.css', import.meta.url)), 'utf8');

describe('login hero styles', () => {
  test('AC3 — with reduced motion the video is hidden and the poster keeps the frame', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.hero__media video\s*\{\s*display:\s*none/,
    );
  });

  test('AC1 — the hero paints the dark identity tokens and the mono/display fonts', () => {
    expect(css).toMatch(/\.hero\s*\{[^}]*--text:\s*#ffffff/);
    expect(css).toMatch(/\.hero\s*\{[^}]*--font-display:/);
  });

  test('AC3 — at 390px the panel stacks under the hero', () => {
    expect(css).toMatch(/@media \(max-width:\s*720px\)/);
    expect(css).toMatch(/\.hero__media\s*\{[^}]*height:\s*46svh/);
  });

  test('AC2 — the credentials in the note keep their case: the login compares them case-sensitively', () => {
    expect(css).toMatch(/\.hero__note code\s*\{[^}]*text-transform:\s*none/);
  });
});

describe('login hero media', () => {
  test('AC3 — the mp4 is not downloaded when the motion is reduced: the source is gated by the media query', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    // The browser skips a source whose media query does not match: with reduced motion the
    // 5.3 MB mp4 is never fetched (the poster paints the frame). The query is negated so it
    // matches when the motion is not reduced; an engine that does not know the feature resolves
    // it to unknown, and unknown never matches: the source is skipped there too.
    expect(html).toMatch(/<source[^>]*media="not \(prefers-reduced-motion: reduce\)"/);
    expect(html).toContain(VIDEO_URL);
    // A src attribute on the video would be fetched whatever the motion preference is.
    expect(html).not.toMatch(/<video[^>]*\ssrc=/);
    vi.unstubAllEnvs();
  });

  test('AC6 — the poster is painted twice, so a video that fails leaves the frame on screen', async () => {
    vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
    const html = renderToStaticMarkup(await LoginPage());
    // The container paints the poster as its background and the video carries it as its poster:
    // the media element has no error handler, the fallback does not need one.
    expect(html).toContain(`background-image:url(${POSTER_URL})`);
    expect(html).toMatch(/<video[^>]*poster="[^"]*"/);
    vi.unstubAllEnvs();
  });
});
