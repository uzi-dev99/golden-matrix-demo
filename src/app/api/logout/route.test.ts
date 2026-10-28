import { describe, expect, test } from 'vitest';
import { POST } from './route';

describe('POST /api/logout', () => {
  test('AC7 — the session cookie is cleared', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(res.cookies.get('astrolabio_session')?.value).toBe('');
    expect(res.headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});
