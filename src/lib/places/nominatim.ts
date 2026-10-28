import type { NatalPlace } from '@/lib/types';
import { timezoneFor } from '@/lib/timezone';

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}

/** "City, Country" when the address has both, else the first two parts of display_name. */
export function placeLabel(item: NominatimItem): string {
  const a = item.address ?? {};
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? item.name;
  if (city && a.country) return `${city}, ${a.country}`;
  return item.display_name.split(',').map((s) => s.trim()).slice(0, 2).join(', ');
}

export function toPlaces(items: NominatimItem[]): NatalPlace[] {
  const out: NatalPlace[] = [];
  for (const it of items) {
    const latitude = Number(Number(it.lat).toFixed(6));
    const longitude = Number(Number(it.lon).toFixed(6));
    const timezone = Number.isFinite(latitude) && Number.isFinite(longitude) ? timezoneFor(latitude, longitude) : null;
    if (timezone) out.push({ label: placeLabel(it), latitude, longitude, timezone });
  }
  return out;
}

// Nominatim usage policy: identifying User-Agent, at most 1 request/second, no autocomplete.
// shortcut: cache and throttle live in this process; with several replicas the limit multiplies, move it to the edge then.
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: NatalPlace[] }>();
let nextSlot = 0;

export function __resetPlacesForTests(): void {
  cache.clear();
  nextSlot = 0;
}

async function throttle(now = Date.now()): Promise<void> {
  const wait = Math.max(0, nextSlot - now);
  nextSlot = now + wait + 1000;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export async function searchPlaces(
  query: string,
  userAgent: string,
  fetchImpl: typeof fetch = fetch,
): Promise<NatalPlace[]> {
  const q = query.trim().toLowerCase();
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  await throttle();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query.trim(), format: 'jsonv2', addressdetails: '1', limit: '5', 'accept-language': 'es' }).toString();
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': userAgent, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000), // a hanging Nominatim must not hold the request open
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const value = toPlaces((await res.json()) as NominatimItem[]);
  cache.set(q, { at: Date.now(), value });
  return value;
}
