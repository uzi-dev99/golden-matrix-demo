import { describe, expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import { HeroMedia } from './HeroMedia';

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
    // mp4 is never fetched and the poster paints the frame. The query is negated, so an engine
    // that does not know the feature (it evaluates the query as false) still gets the video.
    expect(html).toMatch(/<source[^>]*media="not \(prefers-reduced-motion: reduce\)"/);
    // A src attribute on the video would be fetched whatever the motion preference is.
    expect(html).not.toMatch(/<video[^>]*\ssrc=/);
  });
});
