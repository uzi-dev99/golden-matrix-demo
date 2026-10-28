import { describe, expect, test } from 'vitest';
import { signSession, verifySession } from './session';

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
