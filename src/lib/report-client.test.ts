import { describe, expect, test, vi } from 'vitest';
import { OK_STREAM, sseResponse } from '@/test/sse-fixtures';
import type { ReportEvent } from '@/lib/types';
import { streamReport } from './report-client';

const req = { input: {} as never, options: { tone: 'neutral', length: 'short' } as const, model: 'openrouter/free' };

describe('report client', () => {
  test('AC12 — relays SSE events in order', async () => {
    // server events, not provider events
    const body = ['data: {"type":"delta","text":"## A\\nx"}', 'data: {"type":"meta","meta":{"model":"m"}}', ''].join('\n\n');
    const seen: ReportEvent[] = [];
    await streamReport(req, (e) => seen.push(e), undefined, vi.fn(async () => sseResponse(body)) as unknown as typeof fetch);
    expect(seen.map((e) => e.type)).toEqual(['delta', 'meta']);
    expect(OK_STREAM).toContain('[DONE]');
  });
  test('AC12 — a non-2xx answer becomes one error event with the server message', async () => {
    const seen: ReportEvent[] = [];
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: 'RATE_LIMITED', message: 'Demasiados' } }), { status: 429 }));
    await streamReport(req, (e) => seen.push(e), undefined, f as unknown as typeof fetch);
    expect(seen).toEqual([{ type: 'error', code: 'RATE_LIMITED', message: 'Demasiados' }]);
  });
  test('AC12 — an error event from the server ends the run, without a second error', async () => {
    const body = 'data: {"type":"error","code":"EMPTY_COMPLETION","message":"El modelo no devolvió texto."}\n\n';
    const seen: ReportEvent[] = [];
    await streamReport(req, (e) => seen.push(e), undefined, vi.fn(async () => sseResponse(body)) as unknown as typeof fetch);
    expect(seen).toEqual([{ type: 'error', code: 'EMPTY_COMPLETION', message: 'El modelo no devolvió texto.' }]);
  });
  test('AC12 — a dropped connection becomes an error event, so the UI leaves the streaming state', async () => {
    const enc = new TextEncoder();
    const seen: ReportEvent[] = [];
    const f = vi.fn(async () => new Response(new ReadableStream({
      start(c) {
        c.enqueue(enc.encode('data: {"type":"delta","text":"x"}\n\n'));
      },
      pull(c) {
        c.error(new Error('connection reset')); // the connection dies mid-stream
      },
    })));
    await streamReport(req, (e) => seen.push(e), undefined, f as unknown as typeof fetch);
    expect(seen.map((e) => e.type)).toEqual(['delta', 'error']);
    expect(seen.at(-1)).toMatchObject({ message: expect.stringContaining('conexión') });
  });
  test('AC12 — a malformed payload becomes an error event instead of an unhandled rejection', async () => {
    const seen: ReportEvent[] = [];
    const f = vi.fn(async () => sseResponse('data: {oops\n\n'));
    await streamReport(req, (e) => seen.push(e), undefined, f as unknown as typeof fetch);
    expect(seen).toEqual([{ type: 'error', code: 'LLM_ERROR', message: 'Se interrumpió la conexión.' }]);
  });
  test('AC12 — an aborted request rejects without an error event: the caller stops the report', async () => {    const ctrl = new AbortController();
    const seen: ReportEvent[] = [];
    const f = vi.fn(async (_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    }));
    const p = streamReport(req, (e) => seen.push(e), ctrl.signal, f as unknown as typeof fetch);
    ctrl.abort();
    await expect(p).rejects.toThrow(/abort/i);
    expect(seen).toEqual([]);
  });
  test('AC12 — a stream that ends without a terminal event becomes an error, so the button comes back', async () => {
    const seen: ReportEvent[] = [];
    const f = vi.fn(async () => sseResponse('data: {"type":"delta","text":"x"}\n\n'));
    await streamReport(req, (e) => seen.push(e), undefined, f as unknown as typeof fetch);
    expect(seen.map((e) => e.type)).toEqual(['delta', 'error']);
    expect(seen.at(-1)).toMatchObject({ code: 'LLM_ERROR', message: 'Se interrumpió la conexión.' });
  });
});
