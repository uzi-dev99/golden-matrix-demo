import { describe, expect, test, vi } from 'vitest';
import type { BirthInput, NatalChart } from '@/lib/types';
import { POST } from './route';

// The real engine is unit u1; here only the route contract is under test.
vi.mock('@/lib/natal', () => ({
  calculateNatalChart: (input: BirthInput): NatalChart => ({ input, utcInstant: '1990-05-17T12:30:00Z' }) as NatalChart,
}));

const input = { name: 'Elena Prueba', date: '1990-05-17', time: '14:30', place: { label: 'Madrid, España', latitude: 40.416775, longitude: -3.70379, timezone: 'Europe/Madrid' } };
const call = (body: unknown) => POST(new Request('http://x/api/chart', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/chart', () => {
  test('AC8 — a valid input answers the calculated chart', async () => {
    const res = await call(input);
    expect(res.status).toBe(200);
    expect((await res.json()) as { data: { input: BirthInput } }).toMatchObject({ data: { input } });
  });

  test('AC8 — an invalid input is 400 INVALID_INPUT', async () => {
    const res = await call({ ...input, date: '17/05/1990' });
    expect(res.status).toBe(400);
    expect((await res.json()) as { error: { code: string } }).toMatchObject({ error: { code: 'INVALID_INPUT' } });
  });
});
