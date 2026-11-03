import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import { HeroMedia } from './HeroMedia';

const source = readFileSync(fileURLToPath(new URL('./HeroMedia.tsx', import.meta.url)), 'utf8');

describe('shared hero media', () => {
  test('AC1 — the shared component paints the poster and carries exactly one video', () => {
    const html = renderToStaticMarkup(<HeroMedia />);
    expect(html.match(/<video/g)?.length).toBe(1);
    expect(html).toContain(`background-image:url(${POSTER_URL})`);
    expect(html).toContain(VIDEO_URL);
    expect(html).toContain(`poster="${POSTER_URL}"`);
  });

  test('AC4 — the reduced-motion gate is on the source: the mp4 is never downloaded', () => {
    const html = renderToStaticMarkup(<HeroMedia />);
    // The browser skips a source whose media query does not match: with reduced motion the
    // mp4 is never fetched and the poster paints the frame. The query is negated so it matches
    // when the motion is not reduced; an engine that does not know the feature resolves it to
    // unknown, and unknown never matches: the source is skipped there too.
    expect(html).toMatch(/<source[^>]*media="not \(prefers-reduced-motion: reduce\)"/);
    // A src attribute on the video would be fetched whatever the motion preference is.
    expect(html).not.toMatch(/<video[^>]*\ssrc=/);
  });

  test('AC4 — the comment does not promise the video to an engine that cannot match the query', () => {
    // The comment is the only place that explains the gate, so it must not claim that an engine
    // without the feature still gets the video: the unknown query never matches.
    expect(source).not.toMatch(/still gets the video|keeps the video there/);
  });
});
