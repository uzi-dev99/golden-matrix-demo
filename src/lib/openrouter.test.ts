import { afterEach, describe, expect, test, vi } from 'vitest';
import { OK_STREAM, sseResponse } from '@/test/sse-fixtures';
import { __resetCatalogForTests, httpError, listModels, parseChunk, streamCompletion } from './openrouter';

afterEach(() => {
  vi.unstubAllEnvs();
  __resetCatalogForTests();
});

describe('openrouter', () => {
  test('AC10 — parseChunk: delta, usage chunk with empty choices[0], [DONE], comments/garbage', () => {
    expect(parseChunk('{"choices":[{"delta":{"content":"x"}}]}')).toEqual({ type: 'delta', text: 'x' });
    expect(parseChunk('{"choices":[{"delta":{}}],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}')).toMatchObject({ type: 'usage', usage: { totalTokens: 3 } });
    expect(parseChunk('[DONE]')).toBeNull();
    expect(parseChunk('not json')).toBeNull();
    expect(() => parseChunk('{"error":{"message":"boom"}}')).toThrow(/cortó/);
  });
  test('AC10 — streams deltas then usage, sends the key only in the Authorization header and bounds the reasoning', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key-not-real');
    const f = vi.fn(async () => sseResponse(OK_STREAM));
    const events = [];
    for await (const ev of streamCompletion({ model: 'openrouter/free', system: 's', user: 'u' }, f as unknown as typeof fetch)) events.push(ev);
    expect(events.map((e) => e.type)).toEqual(['delta', 'delta', 'usage']);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key-not-real');
    expect(String(init.body)).not.toContain('test-key-not-real');
    expect(JSON.parse(String(init.body))).toMatchObject({
      stream: true,
      model: 'openrouter/free',
      reasoning: { effort: 'low', exclude: true },
    });
  });
  test('AC10 — a concrete model is asked not to reason, so no reasoning can leak into the report', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key-not-real');
    const f = vi.fn(async () => sseResponse(OK_STREAM));
    for await (const ev of streamCompletion({ model: 'nvidia/nemotron-3-ultra-550b-a55b:free', system: 's', user: 'u' }, f as unknown as typeof fetch)) void ev;
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).reasoning).toEqual({ enabled: false });
  });
  test('AC12 — the daily free-model cap is named as such, never retried with another model', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key-not-real');
    const body = '{"error":{"message":"Rate limit exceeded: free-models-per-day. Add 10 credits","code":429}}';
    const f = vi.fn(async () => new Response(body, { status: 429 }));
    const it = streamCompletion({ model: 'openrouter/free', system: 's', user: 'u' }, f as unknown as typeof fetch);
    await expect(it.next()).rejects.toMatchObject({ code: 'RATE_LIMITED', status: 429, retryable: false, message: expect.stringMatching(/cupo diario/) });
    expect(() => parseChunk(body)).toThrow(/cupo diario/);
  });
  test('AC10 — a minimax/ model goes to the MiniMax API with its own key and never sees the OpenRouter key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key-not-real');
    vi.stubEnv('MINIMAX_API_KEY', 'mm-key-not-real');
    const f = vi.fn(async () => sseResponse(OK_STREAM));
    for await (const ev of streamCompletion({ model: 'minimax/MiniMax-M3.1-Flash', system: 's', user: 'u' }, f as unknown as typeof fetch)) void ev;
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.minimax.io/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer mm-key-not-real');
    expect(JSON.stringify(init)).not.toContain('or-key-not-real');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('MiniMax-M3.1-Flash');
    expect(body.reasoning).toBeUndefined();
  });
  test('AC11 — a MiniMax model is listed as paid, without asking the OpenRouter catalog for it', async () => {
    __resetCatalogForTests();
    const f = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
    const [m] = await listModels(['minimax/MiniMax-M3.1-Flash'], f as unknown as typeof fetch);
    expect(m).toEqual({ id: 'minimax/MiniMax-M3.1-Flash', name: 'MiniMax: MiniMax-M3.1-Flash', free: false });
  });
  test('AC10 — a reasoning delta is never content: it does not reach the client', () => {
    expect(parseChunk('{"choices":[{"delta":{"reasoning":"thinking"}}]}')).toBeNull();
    expect(parseChunk('{"choices":[{"delta":{"reasoning_content":"thinking"}}]}')).toBeNull();
    expect(parseChunk('{"choices":[{"delta":{"reasoning":"thinking","content":"## A"}}]}')).toEqual({ type: 'delta', text: '## A' });
  });
  test('AC10 — HTTP errors map to stable codes (429, 402, 401) and never forward the upstream body', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'k');
    expect(httpError(429)).toMatchObject({ code: 'RATE_LIMITED', status: 429 });
    expect(httpError(402).message).toMatch(/Crédito/);
    const f = vi.fn(async () => new Response('{"error":{"message":"secret upstream detail"}}', { status: 401 }));
    await expect(streamCompletion({ model: 'm', system: 's', user: 'u' }, f as unknown as typeof fetch).next()).rejects.toMatchObject({ code: 'LLM_ERROR' });
  });
  test('AC10 — missing key throws before any network call', async () => {
    const f = vi.fn();
    await expect(streamCompletion({ model: 'm', system: 's', user: 'u' }, f as unknown as typeof fetch).next()).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(f).not.toHaveBeenCalled();
  });
  test('AC10 — listModels joins the catalog and falls back to the bare id', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'a/b:free', name: 'A B', context_length: 1000, pricing: { prompt: '0', completion: '0' } }] })));
    const out = await listModels(['a/b:free', 'z/unknown'], f as unknown as typeof fetch);
    expect(out[0]).toEqual({ id: 'a/b:free', name: 'A B', contextLength: 1000, free: true });
    expect(out[1]).toEqual({ id: 'z/unknown', name: 'z/unknown', free: false });
  });
});
