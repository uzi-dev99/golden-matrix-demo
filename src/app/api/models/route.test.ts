import { afterEach, describe, expect, test, vi } from 'vitest';
import { __resetCatalogForTests } from '@/lib/openrouter';
import { GET } from './route';

afterEach(() => {
  vi.unstubAllGlobals();
  __resetCatalogForTests();
});

describe('GET /api/models', () => {
  test('AC10 — the allow-list is served with the default first', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'openrouter/free', name: 'Free router', context_length: 1000, pricing: { prompt: '0', completion: '0' } }] }))));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.default).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
    expect(body.data.models.map((m: { id: string }) => m.id)).toEqual(['nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter/free', 'google/gemma-4-31b-it:free']);
    expect(body.data.models[0].free).toBe(true);
  });
});
