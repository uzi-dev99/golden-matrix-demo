import { allowedModels, rateLimitPerHour, trustedProxyHops } from '@/lib/config';
import { err, internalError, parseBody } from '@/lib/api/envelope';
import { clientIp } from '@/lib/http';
import { calculateNatalChart } from '@/lib/natal';
import { LlmError, streamCompletion, type StreamEvent } from '@/lib/openrouter';
import { buildPrompt } from '@/lib/prompt/build-prompt';
import { segmentsToText } from '@/lib/prompt/render';
import { takeToken } from '@/lib/rate-limit';
import { reportRequestSchema } from '@/lib/schemas';
import { safeStream } from '@/lib/sse';
import type { ReportEvent, ReportMeta } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();
const sse = (ev: ReportEvent) => encoder.encode(`data: ${JSON.stringify(ev)}\n\n`);

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const body = await parseBody(req, reportRequestSchema);
    if (!body.ok) return body.res;
    const { input, options, model } = body.data;

    if (!allowedModels().includes(model)) return err('MODEL_NOT_ALLOWED', 'Ese modelo no está permitido', 403);

    const wait = takeToken(clientIp(req, trustedProxyHops()), rateLimitPerHour());
    if (wait > 0) {
      return err('RATE_LIMITED', 'Demasiados informes seguidos. Inténtalo más tarde.', 429, { 'Retry-After': String(wait) });
    }

    let chart;
    try {
      chart = calculateNatalChart(input); // the server never trusts a chart sent by the client
    } catch (e) {
      return err('INVALID_INPUT', e instanceof Error ? e.message : 'No se pudo calcular la carta');
    }
    const prompt = buildPrompt(input, chart, options);

    // Pull the first event before answering so provider errors (401/402/429) become real HTTP statuses.
    const it = streamCompletion({ model, system: segmentsToText(prompt.system), user: segmentsToText(prompt.user), signal: req.signal });
    let first: IteratorResult<StreamEvent>;
    try {
      first = await it.next();
    } catch (e) {
      if (e instanceof LlmError) return err(e.code, e.message, e.status);
      if (e instanceof Error && /OPENROUTER_API_KEY/.test(e.message)) return err('LLM_ERROR', 'El servicio de IA no está configurado.', 503);
      throw e;
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let text = '';
        let firstTokenMs: number | undefined;
        let usage: Extract<StreamEvent, { type: 'usage' }> | undefined;
        const handle = (ev: StreamEvent) => {
          if (ev.type === 'delta') {
            firstTokenMs ??= Date.now() - t0;
            text += ev.text;
            safeStream(() => controller.enqueue(sse({ type: 'delta', text: ev.text })));
          } else usage = ev;
        };
        try {
          if (!first.done) handle(first.value);
          for (let n = await it.next(); !n.done; n = await it.next()) handle(n.value);
          if (!text.trim()) {
            // The provider spent the whole budget reasoning: there is no report to show, so it is an error, not a success.
            safeStream(() => controller.enqueue(sse({ type: 'error', code: 'EMPTY_COMPLETION', message: 'El modelo no devolvió texto: puede haber gastado el presupuesto razonando. Prueba con otro modelo.' })));
            return;
          }
          const u = usage?.usage;
          const meta: ReportMeta = {
            model,
            servedModel: usage?.servedModel,
            latencyMs: Date.now() - t0,
            firstTokenMs,
            promptTokens: u?.promptTokens ?? prompt.estimatedTokens,
            completionTokens: u?.completionTokens ?? Math.ceil(text.length / 4),
            totalTokens: u?.totalTokens ?? prompt.estimatedTokens + Math.ceil(text.length / 4),
            costUsd: u?.costUsd,
            generationId: usage?.generationId,
            promptVersion: prompt.version,
            usageEstimated: u ? undefined : true,
          };
          safeStream(() => controller.enqueue(sse({ type: 'meta', meta })));
        } catch (e) {
          const message = e instanceof LlmError ? e.message : 'La generación se interrumpió.';
          safeStream(() => controller.enqueue(sse({ type: 'error', code: 'LLM_ERROR', message })));
        } finally {
          safeStream(() => controller.close());
        }
      },
      cancel() {
        void it.return?.(undefined);
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
    });
  } catch (e) {
    return internalError(e, 'api/report');
  }
}
