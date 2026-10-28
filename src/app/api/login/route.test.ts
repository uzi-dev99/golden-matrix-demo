import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { POST } from './route';

beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 's'.repeat(32));
  vi.stubEnv('DEMO_PASSWORD', 'astrolabio-demo');
  vi.stubEnv('DEMO_USER', 'demo');
});
afterEach(() => vi.unstubAllEnvs());

const call = (body: unknown) =>
  POST(new Request('http://x/api/login', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/login', () => {
  test('AC7 — wrong credentials are 401 INVALID_CREDENTIALS with a Spanish message', async () => {
    const res = await call({ user: 'demo', password: 'wrong' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { ok: boolean; error: { code: string; message: string } };
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(body.error.message).toMatch(/incorrect/i);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  test('AC7 — good credentials answer 200 and set the signed session cookie', async () => {
    const res = await call({ user: 'demo', password: 'astrolabio-demo' });
    expect(res.status).toBe(200);
    expect((await res.json()) as { data: { user: string } }).toMatchObject({ data: { user: 'demo' } });
    const cookie = res.cookies.get('astrolabio_session');
    expect(cookie?.value).toBeTruthy();
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/);
    expect(res.headers.get('set-cookie')).toMatch(/SameSite=lax/);
  });

  test('AC7 — an empty body is 400 INVALID_INPUT', async () => {
    const res = await call({ user: '', password: '' });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  });
});
