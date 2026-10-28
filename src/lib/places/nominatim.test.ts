import { beforeEach, describe, expect, test, vi } from 'vitest';
import { __resetPlacesForTests, placeLabel, searchPlaces } from './nominatim';

const item = { display_name: 'Madrid, Comunidad de Madrid, España', lat: '40.4167754', lon: '-3.7037902', name: 'Madrid', address: { city: 'Madrid', country: 'España' } };
const reply = (body: unknown, ok = true) => vi.fn(async () => ({ ok, status: ok ? 200 : 503, json: async () => body }) as unknown as Response);

beforeEach(() => __resetPlacesForTests());

describe('places proxy', () => {
  test('AC8 — label, 6-decimal coordinates and zone', async () => {
    const f = reply([item]);
    const out = await searchPlaces('Madrid', 'UA/1', f);
    expect(out).toEqual([{ label: 'Madrid, España', latitude: 40.416775, longitude: -3.70379, timezone: 'Europe/Madrid' }]);
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get('limit')).toBe('5');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('UA/1');
  });
  test('AC8 — repeated query is served from the cache (one upstream call, all calls recorded)', async () => {
    const f = reply([item]);
    await searchPlaces('Madrid', 'UA/1', f);
    await searchPlaces('  madrid ', 'UA/1', f);
    expect(f).toHaveBeenCalledTimes(1);
  });
  test('AC8 — two different queries are at least ~1 s apart', async () => {
    const f = reply([item]);
    const t0 = Date.now();
    await searchPlaces('uno', 'UA/1', f);
    await searchPlaces('dos', 'UA/1', f);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(950);
    expect(f).toHaveBeenCalledTimes(2);
  });
  test('AC8 — upstream failure throws; unlabelled item falls back to display_name', async () => {
    await expect(searchPlaces('x', 'UA/1', reply([], false))).rejects.toThrow(/503/);
    expect(placeLabel({ display_name: 'A, B, C', lat: '0', lon: '0' })).toBe('A, B');
  });
  test('AC9 — the upstream call carries a timeout signal and an aborted call rejects', async () => {
    const f = vi.fn(async (_url: URL, init?: RequestInit) => {
      if (!init?.signal) throw new Error('no signal');
      throw new DOMException('The operation was aborted', 'AbortError');
    });
    await expect(searchPlaces('madrid', 'UA/1', f as unknown as typeof fetch)).rejects.toThrow(/abort/i);
    const [, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});
