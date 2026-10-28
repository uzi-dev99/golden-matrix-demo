import { z } from 'zod';
import { err, ok } from '@/lib/api/envelope';
import { timezoneFor } from '@/lib/timezone';

const querySchema = z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) });

/** Used when the user drags the marker: the zone is resolved server-side so the lookup data stays out of the bundle. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = querySchema.safeParse({ lat: sp.get('lat'), lon: sp.get('lon') });
  if (!q.success) return err('INVALID_INPUT', 'Coordenadas inválidas');
  const timezone = timezoneFor(q.data.lat, q.data.lon);
  return timezone ? ok({ timezone }) : err('INVALID_INPUT', 'No se pudo resolver la zona horaria de ese punto');
}
