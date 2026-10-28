import { defaultModel } from '@/lib/config';
import { err, internalError, ok, parseBody } from '@/lib/api/envelope';
import { requireBearer } from '@/lib/auth/bearer';
import { apiReportRequestSchema } from '@/lib/api/v1-schemas';
import { createSseParser } from '@/lib/sse';
import { splitSections } from '@/lib/sections';
import type { ReportEvent, ReportMeta } from '@/lib/types';
import { POST as streamReport } from '@/app/api/report/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The app's streaming report behind a Bearer token. `Accept: text/event-stream` passes the SSE
 * stream through; otherwise the stream is collected into one JSON answer.
 */
export async function POST(req: Request) {
  const denied = await requireBearer(req);
  if (denied) return denied;
  try {
    const body = await parseBody(req, apiReportRequestSchema);
    if (!body.ok) return body.res;
    const inner = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({ ...body.data, model: body.data.model ?? defaultModel() }),
      signal: req.signal,
    });
    const res = await streamReport(inner);
    const streaming = res.headers.get('content-type')?.startsWith('text/event-stream');
    if (!streaming || req.headers.get('accept')?.includes('text/event-stream')) return res;

    let report = '';
    let meta: ReportMeta | undefined;
    const parse = createSseParser();
    const decoder = new TextDecoder();
    const reader = res.body!.getReader();
    for (let r = await reader.read(); !r.done; r = await reader.read()) {
      for (const data of parse(decoder.decode(r.value, { stream: true }))) {
        const ev = JSON.parse(data) as ReportEvent;
        if (ev.type === 'delta') report += ev.text;
        else if (ev.type === 'meta') meta = ev.meta;
        else return err(ev.code, ev.message, 502);
      }
    }
    return ok({ report, sections: splitSections(report), meta });
  } catch (e) {
    return internalError(e, 'api/v1/report');
  }
}
