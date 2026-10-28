import { afterEach, describe, expect, test, vi } from 'vitest';
import { sessionCookieOptions, signSession, verifySession } from './session';

const SECRET = 'x'.repeat(32);

describe('session cookie', () => {
  test('AC7 — round trip', async () => {
    const t = await signSession('demo', SECRET, 1000);
    expect(await verifySession(t, SECRET, 1001)).toEqual({ user: 'demo', exp: 1000 + 28800 });
  });
  test('AC7 — wrong secret, tampered payload, expired, garbage are all null', async () => {
    const t = await signSession('demo', SECRET, 1000);
    expect(await verifySession(t, 'y'.repeat(32), 1001)).toBeNull();
    const [p, s] = t.split('.');
    const forged = btoa(JSON.stringify({ user: 'admin', exp: 9e9 })).replace(/=+$/, '');
    expect(await verifySession(`${forged}.${s}`, SECRET, 1001)).toBeNull();
    expect(await verifySession(`${p}.${s}`, SECRET, 1000 + 28800 + 1)).toBeNull();
    expect(await verifySession('nope', SECRET)).toBeNull();
    expect(await verifySession(undefined, SECRET)).toBeNull();
    expect(await verifySession(`${p}.${s}.x`, SECRET, 1001)).toBeNull();
  });
});

describe('session cookie options', () => {
  afterEach(() => vi.unstubAllEnvs());
  test('Secure in production unless SITE_URL is explicitly plain http', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SITE_URL', 'https://astrolabio.example');
    expect(sessionCookieOptions().secure).toBe(true);
    vi.stubEnv('SITE_URL', '');
    expect(sessionCookieOptions().secure).toBe(true);
    vi.stubEnv('SITE_URL', ' HTTP://192.168.0.3:3100');
    expect(sessionCookieOptions().secure).toBe(false);
    expect(sessionCookieOptions()).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });
});
