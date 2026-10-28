/** Builds a fetch Response that streams the given SSE text in small chunks, like a real provider. */
export function sseResponse(body: string, init: ResponseInit = {}): Response {
  const enc = new TextEncoder();
  const bytes = enc.encode(body);
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (let i = 0; i < bytes.length; i += 23) c.enqueue(bytes.slice(i, i + 23));
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream', 'x-generation-id': 'gen-test' }, ...init });
}

export const OK_STREAM = [
  ': OPENROUTER PROCESSING',
  'data: {"id":"gen-1","model":"vendor/served:free","choices":[{"index":0,"delta":{"content":"## Visión general\\n"}}]}',
  'data: {"id":"gen-1","choices":[{"index":0,"delta":{"content":"Hola."}}]}',
  'data: {"id":"gen-1","model":"vendor/served:free","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":120,"completion_tokens":8,"total_tokens":128,"cost":0}}',
  'data: [DONE]',
  '',
].join('\n\n');
