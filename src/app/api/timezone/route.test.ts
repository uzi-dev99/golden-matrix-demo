import { describe, expect, test } from 'vitest';
import { GET } from './route';

const call = (query: string) => GET(new Request(`http://x/api/timezone?${query}`));

describe('GET /api/timezone', () => {
  test('AC8 — valid coordinates answer the IANA zone of that point', async () => {
    const res = await call('lat=40.416775&lon=-3.70379');
    expect(res.status).toBe(200);
    expect((await res.json()) as { data: { timezone: string } }).toMatchObject({ data: { timezone: 'Europe/Madrid' } });
  });

  test('AC8 — coordinates out of range are 400 INVALID_INPUT', async () => {
    const res = await call('lat=999&lon=-3.7');
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  });
});
