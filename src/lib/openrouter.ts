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
  | { type: 'delta'; text: string; servedModel?: string }
  | { type: 'usage'; usage: Usage; servedModel?: string; generationId?: string };

export class LlmError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 502,
    /** False for key problems (401/402): another model would fail the same way. */
    public retryable = true,
  ) {
    super(message);
  }
}

const DAILY_LIMIT_MESSAGE =
  'Se agotó el cupo diario de modelos gratuitos de esta demo en OpenRouter. Vuelve a probar mañana.';

/** The account-wide daily cap of free models: no other free model can answer until it resets. */
function dailyLimit(text: string | undefined): LlmError | null {
  return text && /free-models-per-day/.test(text) ? new LlmError('RATE_LIMITED', DAILY_LIMIT_MESSAGE, 429, false) : null;
}

const HTTP_MESSAGES: Record<number, string> = {
  401: 'La clave de OpenRouter no es válida.',
  402: 'Crédito de OpenRouter agotado.',
  408: 'El modelo tardó demasiado en responder.',
  429: 'El modelo está limitado por el proveedor. Prueba otro modelo o espera un momento.',
};

/** Maps a non-2xx OpenRouter answer to a stable error. The upstream body is never forwarded. */
export function httpError(status: number): LlmError {
  return new LlmError(
    status === 429 ? 'RATE_LIMITED' : 'LLM_ERROR',
    HTTP_MESSAGES[status] ?? 'El proveedor del modelo no respondió bien.',
    status === 429 ? 429 : 502,
    status !== 401 && status !== 402,
  );
}

/** Parses one `data:` payload. Returns null for [DONE] and for chunks that carry nothing to show. */
export function parseChunk(data: string): StreamEvent | null {
  if (data.trim() === '[DONE]') return null;
  let json: {
    id?: string;
    model?: string;
    error?: { message?: string; code?: number };
    choices?: { delta?: { content?: string | null } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; cost?: number };
  };
  try {
    json = JSON.parse(data);
  } catch {
    return null; // not JSON: ignore, as the SSE spec allows
  }
  if (json.error) throw dailyLimit(json.error.message) ?? new LlmError('LLM_ERROR', 'El modelo cortó la respuesta a mitad de camino.');
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
  // The model that answers travels in every chunk, not only in the usage one: keep it to name the writer.
  return text ? { type: 'delta', text, servedModel: json.model } : null;
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
      // A concrete model gets no reasoning (some providers leak it as content). A router such as
      // openrouter/free may pick a model where reasoning is mandatory: bound and exclude it there.
      reasoning: args.model.startsWith('openrouter/') ? { effort: 'low', exclude: true } : { enabled: false },
      messages: [
        { role: 'system', content: args.system },
        { role: 'user', content: args.user },
      ],
    }),
  });
  if (!res.ok || !res.body) throw dailyLimit(await res.text().catch(() => undefined)) ?? httpError(res.status);

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
