import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { __resetPlacesForTests } from '@/lib/places/nominatim';
import { GET } from './route';

const item = { display_name: 'Madrid, Comunidad de Madrid, España', lat: '40.4167754', lon: '-3.7037902', name: 'Madrid', address: { city: 'Madrid', country: 'España' } };

beforeEach(() => {
  __resetPlacesForTests();
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([item]), { status: 200 })));
});
afterEach(() => {
  vi.unstubAllGlobals();
  __resetPlacesForTests();
});

const call = (q: string) => GET(new Request(`http://x/api/places?q=${encodeURIComponent(q)}`));

describe('GET /api/places', () => {
  test('AC8 — a query of 3+ letters returns the places with label, coordinates and zone', async () => {
    const res = await call('Madrid');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual([{ label: 'Madrid, España', latitude: 40.416775, longitude: -3.70379, timezone: 'Europe/Madrid' }]);
  });

  test('AC8 — a query under 3 letters is 400 INVALID_INPUT', async () => {
    const res = await call('Ma');
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  });

  test('AC8 — an upstream failure is 502 PLACES_ERROR and the upstream body is not forwarded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 503 })));
    const res = await call('Madrid');
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('PLACES_ERROR');
    expect(body.error.message).not.toContain('boom');
  });
});
