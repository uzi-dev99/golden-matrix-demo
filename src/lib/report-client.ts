import { createSseParser } from '@/lib/sse';
import type { ErrorCode, ReportEvent, ReportRequest } from '@/lib/types';

/**
 * Calls POST /api/report and reports each SSE event. Pre-stream failures arrive as one `error` event.
 * A client-side failure (dropped connection, malformed payload) also arrives as an `error` event;
 * an aborted request rejects, so the caller can leave the report in its "stopped" state.
 */
export async function streamReport(
  req: ReportRequest,
  onEvent: (ev: ReportEvent) => void,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const feed = createSseParser();
  const decoder = new TextDecoder();
  let terminal = false; // the run is over only with a `meta` or an `error` event
  try {
    const res = await fetchImpl('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal,
    });
    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => null)) as { error?: { code: ErrorCode; message: string } } | null;
      onEvent({ type: 'error', code: j?.error?.code ?? 'LLM_ERROR', message: j?.error?.message ?? 'No se pudo generar el informe.' });
      return;
    }
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const data of feed(decoder.decode(value, { stream: true }))) {
        const ev = JSON.parse(data) as ReportEvent;
        if (ev.type === 'meta' || ev.type === 'error') terminal = true;
        onEvent(ev);
      }
    }
    // The body ended without a terminal event: the run never finished.
    if (!terminal) onEvent({ type: 'error', code: 'LLM_ERROR', message: 'Se interrumpió la conexión.' });
  } catch (e) {
    if (signal?.aborted) throw e; // the user pressed "Detener": the caller owns the state
    onEvent({ type: 'error', code: 'LLM_ERROR', message: 'Se interrumpió la conexión.' });
  }
}
