import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { __resetRateLimitForTests } from '@/lib/rate-limit';
import { safeStream } from '@/lib/sse';
import { OK_STREAM, sseResponse } from '@/test/sse-fixtures';
import { POST } from './route';

const input = { name: 'Persona de prueba', date: '1990-05-17', time: '14:30', place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' } };
const call = (body: unknown, ip = '9.9.9.9') =>
  POST(new Request('http://x/api/report', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify(body) }));
const good = { input, options: { tone: 'neutral', length: 'short' }, model: 'openrouter/free' };

/** A reasoning model that spent the whole budget thinking: reasoning deltas (never content) + usage. */
const REASONING_ONLY_STREAM = [
  'data: {"id":"gen-2","model":"dots-studio/dots-3-note-preview:free","choices":[{"index":0,"delta":{"reasoning":"Let me think"}}]}',
  'data: {"id":"gen-2","model":"dots-studio/dots-3-note-preview:free","choices":[{"index":0,"delta":{},"finish_reason":"length"}],"usage":{"prompt_tokens":1150,"completion_tokens":1800,"total_tokens":2950,"cost":0}}',
  'data: [DONE]',
  '',
].join('\n\n');

/** A free model with no usage chunk (the normal case): the report arrives, the token count does not. */
const NO_USAGE_STREAM = [
  'data: {"id":"gen-3","model":"vendor/served:free","choices":[{"index":0,"delta":{"content":"## Visión general\\n"}}]}',
  'data: {"id":"gen-3","choices":[{"index":0,"delta":{"content":"Hola."}}]}',
  'data: [DONE]',
  '',
].join('\n\n');

/** The same, from a provider that does not name the model in its chunks. */
const NO_MODEL_NO_USAGE_STREAM = [
  'data: {"id":"gen-4","choices":[{"index":0,"delta":{"content":"## Visión general\\n"}}]}',
  'data: [DONE]',
  '',
].join('\n\n');

/** Counts how many provider streams are closed by the route. */
const closed = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/lib/openrouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/openrouter')>();
  return {
    ...actual,
    streamCompletion: (...args: Parameters<typeof actual.streamCompletion>) => {
      const gen = actual.streamCompletion(...args);
      const close = gen.return.bind(gen);
      gen.return = (value) => {
        closed.count += 1;
        return close(value);
      };
      return gen;
    },
  };
});

beforeEach(() => {
  __resetRateLimitForTests();
  closed.count = 0;
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key-not-real');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/report', () => {
  test('AC10 — streams delta events then meta with model, latency and usage', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(OK_STREAM)));
    const res = await call(good);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const events = (await res.text()).trim().split('\n\n').map((b) => JSON.parse(b.replace(/^data: /, '')));
    expect(events.filter((e) => e.type === 'delta').map((e) => e.text).join('')).toBe('## Visión general\nHola.');
    const meta = events.at(-1);
    expect(meta.type).toBe('meta');
    expect(meta.meta).toMatchObject({ model: 'openrouter/free', servedModel: 'vendor/served:free', promptTokens: 120, completionTokens: 8, totalTokens: 128, promptVersion: 'astrolabio-prompt/1.2.0' });
    expect(meta.meta.latencyMs).toBeGreaterThanOrEqual(0);
  });
  test('AC12 — a provider stream with no content ends in an error event, not in a success meta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(REASONING_ONLY_STREAM)));
    const res = await call(good);
    expect(res.status).toBe(200);
    const events = (await res.text()).trim().split('\n\n').map((b) => JSON.parse(b.replace(/^data: /, '')));
    expect(events.map((e) => e.type)).toEqual(['error']);
    expect(events[0]).toMatchObject({ code: 'EMPTY_COMPLETION' });
    expect(events[0].message).toMatch(/no devolvió texto/);
  });
  test('AC12 — when the requested model fails or answers nothing, the report comes from openrouter/free once', async () => {
    const nemotron = { ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' };
    const bodies: string[] = [];
    for (const failure of [() => new Response('{}', { status: 503 }), () => sseResponse(REASONING_ONLY_STREAM)]) {
      bodies.length = 0;
      let n = 0;
      vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => (bodies.push(String(init.body)), n++ === 0 ? failure() : sseResponse(OK_STREAM))));
      const res = await call(nemotron, `10.0.0.${n + bodies.length + 1}`);
      const events = (await res.text()).trim().split('\n\n').map((b) => JSON.parse(b.replace(/^data: /, '')));
      expect(events.at(-1).meta).toMatchObject({ model: 'nvidia/nemotron-3-ultra-550b-a55b:free', servedModel: 'vendor/served:free' });
      expect(bodies.map((b) => JSON.parse(b).model)).toEqual(['nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter/free']);
    }
  });
  test('AC12 — the fallback is tried once: when it fails too, its error is the answer', async () => {
    const nemotron = { ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' };
    // The requested model fails (503) and answers nothing (reasoning only); the fallback then fails with 429.
    for (const first of [() => new Response('{}', { status: 503 }), () => sseResponse(REASONING_ONLY_STREAM)]) {
      const bodies: string[] = [];
      let n = 0;
      vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        n += 1;
        return n === 1 ? first() : new Response('{}', { status: 429 });
      }));
      const res = await call(nemotron, `10.1.0.${n}`);
      expect(bodies.map((b) => JSON.parse(b).model)).toEqual(['nvidia/nemotron-3-ultra-550b-a55b:free', 'openrouter/free']);
      expect(res.status).toBe(429);
      expect((await res.json()).error.code).toBe('RATE_LIMITED');
    }
  });
  test('AC12 — the meta names the model that served the report, even without a usage chunk', async () => {
    const nemotron = { ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' };
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (n += 1) === 1 ? sseResponse(REASONING_ONLY_STREAM) : sseResponse(NO_USAGE_STREAM)));
    const res = await call(nemotron, '10.1.1.1');
    const events = (await res.text()).trim().split('\n\n').map((b) => JSON.parse(b.replace(/^data: /, '')));
    expect(events.at(-1).meta).toMatchObject({ model: 'nvidia/nemotron-3-ultra-550b-a55b:free', servedModel: 'vendor/served:free' });
  });
  test('AC12 — the meta names the fallback model when the provider does not name any model', async () => {
    const nemotron = { ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' };
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (n += 1) === 1 ? sseResponse(REASONING_ONLY_STREAM) : sseResponse(NO_MODEL_NO_USAGE_STREAM)));
    const res = await call(nemotron, '10.1.1.2');
    const events = (await res.text()).trim().split('\n\n').map((b) => JSON.parse(b.replace(/^data: /, '')));
    expect(events.at(-1).meta).toMatchObject({ model: 'nvidia/nemotron-3-ultra-550b-a55b:free', servedModel: 'openrouter/free' });
  });
  test('AC12 — the discarded model iterator is closed when the fallback serves', async () => {
    const nemotron = { ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' };
    let n = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (n += 1) === 1 ? sseResponse(REASONING_ONLY_STREAM) : sseResponse(OK_STREAM)));
    await (await call(nemotron, '10.1.1.3')).text();
    expect(closed.count).toBe(1);
  });
  test('AC12 — a bad key (401) does not try the fallback model', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', f);
    const res = await call({ ...good, model: 'nvidia/nemotron-3-ultra-550b-a55b:free' });
    expect(res.status).toBe(502);
    expect(f).toHaveBeenCalledTimes(1);
  });
  test('AC10 — a model outside the allow-list is 403 and never reaches the provider', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const res = await call({ ...good, model: 'evil/model' });
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe('MODEL_NOT_ALLOWED');
    expect(f).not.toHaveBeenCalled();
  });
  test('AC10 — provider 429 becomes RATE_LIMITED; missing key becomes a clear 503', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
    const r429 = await call(good);
    expect(r429.status).toBe(429);
    expect((await r429.json()).error.code).toBe('RATE_LIMITED');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const r503 = await call(good);
    expect(r503.status).toBe(503);
  });
  test('AC10 — local rate limit: the third call in the hour is 429 with Retry-After', async () => {
    vi.stubEnv('RATE_LIMIT_PER_HOUR', '2');
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(OK_STREAM)));
    await (await call(good)).text();
    await (await call(good)).text();
    const res = await call(good);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
  });
  test('AC11 — the key is never in the response body or in console output', async () => {
    const spy = vi.spyOn(console, 'error');
    vi.stubGlobal('fetch', vi.fn(async () => sseResponse(OK_STREAM)));
    expect(await (await call(good)).text()).not.toContain('test-key-not-real');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('test-key-not-real');
  });
  test('AC10 — invalid body is INVALID_INPUT', async () => {
    const res = await call({ ...good, options: { tone: 'x', length: 'short' } });
    expect(res.status).toBe(400);
  });
  test('AC10 — writing into a closed controller (the client disconnected) does not throw', () => {
    const closed = {
      enqueue: () => { throw new TypeError('Invalid state: Controller is already closed'); },
      close: () => { throw new TypeError('Invalid state: Controller is already closed'); },
    } as unknown as ReadableStreamDefaultController<Uint8Array>;
    expect(() => safeStream(() => closed.enqueue(new Uint8Array()))).not.toThrow();
    expect(() => safeStream(() => closed.close())).not.toThrow();
    // any other error is a bug of the caller and must not be swallowed
    expect(() => safeStream(() => { throw new RangeError('bug'); })).toThrow(RangeError);
  });
  test('AC10 — a client that disconnects mid-stream leaves no unhandled rejection', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    try {
      vi.stubGlobal('fetch', vi.fn(async () => sseResponse(OK_STREAM)));
      const res = await call(good);
      await res.body?.cancel(); // the client goes away while the route is still writing
      await new Promise((r) => setTimeout(r, 30));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    expect(unhandled).toEqual([]);
  });
});
