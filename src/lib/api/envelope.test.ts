import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { err, ok, parseBody } from './envelope';

describe('envelope', () => {
  test('AC7 — ok / err shapes', async () => {
    expect(await ok({ a: 1 }).json()).toEqual({ ok: true, data: { a: 1 } });
    const r = err('INVALID_CREDENTIALS', 'x', 401);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ ok: false, error: { code: 'INVALID_CREDENTIALS', message: 'x' } });
  });
  test('AC10 — parseBody rejects bad json and bad shape', async () => {
    const schema = z.object({ n: z.number() });
    const bad = await parseBody(new Request('http://x', { method: 'POST', body: '{' }), schema);
    expect(bad.ok).toBe(false);
    const wrong = await parseBody(new Request('http://x', { method: 'POST', body: '{"n":"a"}' }), schema);
    expect(wrong.ok).toBe(false);
    const good = await parseBody(new Request('http://x', { method: 'POST', body: '{"n":1}' }), schema);
    expect(good).toEqual({ ok: true, data: { n: 1 } });
  });
});
