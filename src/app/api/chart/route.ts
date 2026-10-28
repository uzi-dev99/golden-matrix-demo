import { err, internalError, ok, parseBody } from '@/lib/api/envelope';
import { calculateNatalChart } from '@/lib/natal';
import { birthInputSchema } from '@/lib/schemas';

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, birthInputSchema);
    if (!body.ok) return body.res;
    try {
      return ok(calculateNatalChart(body.data));
    } catch (e) {
      return err('INVALID_INPUT', e instanceof Error ? e.message : 'No se pudo calcular la carta');
    }
  } catch (e) {
    return internalError(e, 'api/chart');
  }
}
