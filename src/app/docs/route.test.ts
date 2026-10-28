import { describe, expect, test } from 'vitest';
import { GET } from './route';

const SCALAR = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.72.2';

describe('GET /docs', () => {
  test('the page loads only the pinned Scalar script', async () => {
    const html = await (await GET()).text();
    const srcs = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    expect(srcs).toEqual([SCALAR]);
  });
});
