import { describe, expect, test } from 'vitest';
import { calculateNatalChart } from '@/lib/natal';
import { buildPrompt } from '@/lib/prompt/build-prompt';
import { POST } from './route';

const input = { name: 'Persona de prueba', date: '1990-05-17', time: '14:30', place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' } };
const options = { tone: 'warm', length: 'medium' } as const;

describe('POST /api/prompt/preview', () => {
  test('AC10 — the preview is exactly the prompt the report would send', async () => {
    const res = await POST(new Request('http://x/api/prompt/preview', { method: 'POST', body: JSON.stringify({ input, options }) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual(buildPrompt(input, calculateNatalChart(input), options));
  });
  test('AC10 — an invalid body is INVALID_INPUT', async () => {
    const res = await POST(new Request('http://x/api/prompt/preview', { method: 'POST', body: '{' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_INPUT');
  });
});
