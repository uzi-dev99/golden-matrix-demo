import { err, internalError, ok, parseBody } from '@/lib/api/envelope';
import { calculateNatalChart } from '@/lib/natal';
import { buildPrompt } from '@/lib/prompt/build-prompt';
import { previewRequestSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, previewRequestSchema);
    if (!body.ok) return body.res;
    const { input, options } = body.data;
    let chart;
    try {
      chart = calculateNatalChart(input);
    } catch (e) {
      return err('INVALID_INPUT', e instanceof Error ? e.message : 'No se pudo calcular la carta');
    }
    return ok(buildPrompt(input, chart, options));
  } catch (e) {
    return internalError(e, 'api/prompt/preview');
  }
}
