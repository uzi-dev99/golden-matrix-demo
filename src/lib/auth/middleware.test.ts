import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { SESSION_COOKIE, signSession } from './session';

const SECRET = 's'.repeat(32);

beforeEach(() => vi.stubEnv('SESSION_SECRET', SECRET));
afterEach(() => vi.unstubAllEnvs());

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost${path}`, cookie ? { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } } : undefined);

describe('middleware', () => {
  test('AC7 — no session redirects a page to /login with 307', async () => {
    const res = await middleware(req('/resultado'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login');
  });

  test('AC7 — no session answers 401 UNAUTHORIZED on an API route', async () => {
    const res = await middleware(req('/api/chart'));
    expect(res.status).toBe(401);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
  });

  test('AC7 — a valid session cookie lets the request through', async () => {
    const token = await signSession('demo', SECRET);
    const res = await middleware(req('/', token));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  test('AC7 — a forged cookie is treated as no session', async () => {
    const res = await middleware(req('/', 'forged.signature'));
    expect(res.status).toBe(307);
  });

  test('AC11 — a missing SESSION_SECRET answers a clear 500, not an opaque error', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    const res = await middleware(req('/resultado'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(body.ok).toBe(false);
    expect(body.error.message).toBe('SESSION_SECRET is not configured');
  });
});
