import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { POST as token } from './auth/token/route';
import { POST as chart } from './chart/route';
import { POST as report } from './report/route';
import { GET as openapi } from './openapi.json/route';

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://test${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const birth = {
  name: 'Ana Prueba',
  date: '1990-05-14',
  time: '10:30',
  place: { label: 'Madrid', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
};

async function getToken() {
  const res = await token(json('/api/v1/auth/token', { user: 'demo', password: 'pw' }));
  return ((await res.json()) as { data: { access_token: string } }).data.access_token;
}

describe('public API v1', () => {
  beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    vi.stubEnv('DEMO_USER', 'demo');
    vi.stubEnv('DEMO_PASSWORD', 'pw');
  });
  afterEach(() => vi.unstubAllEnvs());

  test('a token is issued only for the demo credentials', async () => {
    expect((await token(json('/api/v1/auth/token', { user: 'demo', password: 'no' }))).status).toBe(401);
    const res = await token(json('/api/v1/auth/token', { user: 'demo', password: 'pw' }));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toMatchObject({ token_type: 'Bearer', expires_in: 28800 });
  });

  test('chart and report need a valid Bearer token', async () => {
    for (const call of [chart, report]) {
      const res = await call(json('/api/v1/x', { input: birth, ...birth }));
      expect(res.status).toBe(401);
      expect(res.headers.get('WWW-Authenticate')).toBe('Bearer');
      expect((await call(json('/api/v1/x', birth, { Authorization: 'Bearer forged.token' }))).status).toBe(401);
    }
  });

  test('the chart is computed with a token', async () => {
    const res = await chart(json('/api/v1/chart', birth, { Authorization: `Bearer ${await getToken()}` }));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.planets).toHaveLength(10);
    expect(data.houses).toHaveLength(12);
  });

  test('the report validates the body before calling the model', async () => {
    const res = await report(json('/api/v1/report', { input: { ...birth, date: 'nope' } }, { Authorization: `Bearer ${await getToken()}` }));
    expect(res.status).toBe(400);
  });

  test('the OpenAPI document lists the three endpoints with bearer security', async () => {
    const doc = await openapi().json();
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths)).toEqual(['/api/v1/auth/token', '/api/v1/chart', '/api/v1/report']);
    expect(doc.paths['/api/v1/chart'].post.security).toEqual([{ bearer: [] }]);
    expect(doc.paths['/api/v1/chart'].post.requestBody.content['application/json'].schema.properties.place).toBeDefined();
  });
});
