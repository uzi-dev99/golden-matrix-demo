import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { __resetRateLimitForTests } from '@/lib/rate-limit';
import { sseResponse, OK_STREAM } from '@/test/sse-fixtures';
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

/** A provider answer with no content: the route answers with an SSE error event. */
const NO_TEXT_STREAM = [
  'data: {"id":"gen-2","model":"vendor/served:free","choices":[{"index":0,"delta":{},"finish_reason":"length"}],"usage":{"prompt_tokens":10,"completion_tokens":0,"total_tokens":10,"cost":0}}',
  'data: [DONE]',
  '',
].join('\n\n');

async function getToken() {
  const res = await token(json('/api/v1/auth/token', { user: 'demo', password: 'pw' }));
  return ((await res.json()) as { data: { access_token: string } }).data.access_token;
}

describe('public API v1', () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
    vi.stubEnv('DEMO_USER', 'demo');
    vi.stubEnv('DEMO_PASSWORD', 'pw');
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key-not-real');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  test('the OpenAPI document does not publish the demo password', async () => {
    const doc = await openapi().json();
    const tokenOp = doc.paths['/api/v1/auth/token'].post;
    expect(tokenOp.requestBody.content['application/json'].example.password).toBe('<contraseña de la demo>');
    expect(tokenOp.description).toContain('/login');
  });

  test('a missing SESSION_SECRET answers a clear 500 instead of crashing', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    for (const call of [chart, report]) {
      const res = await call(json('/api/v1/x', birth, { Authorization: 'Bearer whatever' }));
      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatchObject({ code: 'INTERNAL', message: 'SESSION_SECRET is not configured' });
    }
  });

  test('the report is generated with a token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(OK_STREAM)));
    const res = await report(json('/api/v1/report', { input: birth }, { Authorization: `Bearer ${await getToken()}` }));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.report).toContain('## Visión general');
    expect(data.sections).toEqual([{ title: 'Visión general', body: 'Hola.' }]);
    expect(data.meta).toMatchObject({ servedModel: 'vendor/served:free', totalTokens: 128 });
  });

  test('an SSE error event stops the upstream reader and answers 502', async () => {
    const cancel = vi.spyOn(ReadableStreamDefaultReader.prototype, 'cancel');
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(NO_TEXT_STREAM)));
    const res = await report(json('/api/v1/report', { input: birth }, { Authorization: `Bearer ${await getToken()}` }));
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('EMPTY_COMPLETION');
    expect(cancel).toHaveBeenCalled();
  });
});
