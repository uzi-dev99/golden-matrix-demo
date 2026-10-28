import { openRouterKey, siteUrl, APP_NAME } from '@/lib/config';
import { createSseParser } from '@/lib/sse';
import type { ErrorCode, ModelInfo } from '@/lib/types';

const BASE = 'https://openrouter.ai/api/v1';

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'usage'; usage: Usage; servedModel?: string; generationId?: string };

export class LlmError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

const HTTP_MESSAGES: Record<number, string> = {
  401: 'La clave de OpenRouter no es válida.',
  402: 'Crédito de OpenRouter agotado.',
  408: 'El modelo tardó demasiado en responder.',
  429: 'El modelo está limitado por el proveedor. Prueba otro modelo o espera un momento.',
};

/** Maps a non-2xx OpenRouter answer to a stable error. The upstream body is never forwarded. */
export function httpError(status: number): LlmError {
  return new LlmError(status === 429 ? 'RATE_LIMITED' : 'LLM_ERROR', HTTP_MESSAGES[status] ?? 'El proveedor del modelo no respondió bien.', status === 429 ? 429 : 502);
}

/** Parses one `data:` payload. Returns null for [DONE] and for chunks that carry nothing to show. */
export function parseChunk(data: string): StreamEvent | null {
  if (data.trim() === '[DONE]') return null;
  let json: {
    id?: string;
    model?: string;
    error?: { message?: string };
    choices?: { delta?: { content?: string | null } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  };
  try {
    json = JSON.parse(data);
  } catch {
    return null; // not JSON: ignore, as the SSE spec allows
  }
  if (json.error) throw new LlmError('LLM_ERROR', 'El modelo cortó la respuesta a mitad de camino.');
  if (json.usage) {
    const u = json.usage;
    return {
      type: 'usage',
      usage: { promptTokens: u.prompt_tokens, completionTokens: u.completion_tokens, totalTokens: u.total_tokens, costUsd: u.cost },
      servedModel: json.model,
      generationId: json.id,
    };
  }
  // The final usage chunk also carries choices[0] with no content: never assume choices is empty.
  const text = json.choices?.[0]?.delta?.content;
  return text ? { type: 'delta', text } : null;
}

export async function* streamCompletion(
  args: { model: string; system: string; user: string; signal?: AbortSignal },
  fetchImpl: typeof fetch = fetch,
): AsyncGenerator<StreamEvent> {
  const res = await fetchImpl(`${BASE}/chat/completions`, {
    method: 'POST',
    signal: args.signal,
    headers: {
      Authorization: `Bearer ${openRouterKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl(),
      'X-Title': APP_NAME,
    },
    body: JSON.stringify({
      model: args.model,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: 1800,
      temperature: 0.7,
      // The reasoning budget is bounded so it cannot eat the whole output, and it is excluded so it never streams.
      reasoning: { effort: 'low', exclude: true },
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    }),
  });
  if (!res.ok || !res.body) throw httpError(res.status);

  const feed = createSseParser();
  const decoder = new TextDecoder();
  const reader = res.body.getReader();
  const generationId = res.headers.get('x-generation-id') ?? undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const data of feed(decoder.decode(value, { stream: true }))) {
      const ev = parseChunk(data);
      if (ev?.type === 'usage') yield { ...ev, generationId: ev.generationId ?? generationId };
      else if (ev) yield ev;
    }
  }
}

// ---- catalog (public endpoint, no key needed) ----
const CATALOG_TTL_MS = 60 * 60 * 1000;
let catalog: { at: number; byId: Map<string, ModelInfo> } | null = null;

export function __resetCatalogForTests(): void {
  catalog = null;
}

/** Allow-list ids with display data from the live catalog; falls back to the bare id if the catalog is unreachable. */
export async function listModels(allowed: string[], fetchImpl: typeof fetch = fetch): Promise<ModelInfo[]> {
  if (!catalog || Date.now() - catalog.at > CATALOG_TTL_MS) {
    try {
      const res = await fetchImpl(`${BASE}/models`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { data: { id: string; name: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }[] };
      catalog = {
        at: Date.now(),
        byId: new Map(
          body.data.map((m) => [
            m.id,
            { id: m.id, name: m.name, contextLength: m.context_length, free: m.pricing?.prompt === '0' && m.pricing?.completion === '0' },
          ]),
        ),
      };
    } catch {
      catalog = { at: Date.now() - CATALOG_TTL_MS + 60_000, byId: new Map() }; // retry in a minute
    }
  }
  return allowed.map((id) => catalog?.byId.get(id) ?? { id, name: id, free: id.endsWith(':free') || id === 'openrouter/free' });
}
