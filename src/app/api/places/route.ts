import { z } from 'zod';
import { siteUrl } from '@/lib/config';
import { err, ok } from '@/lib/api/envelope';
import { searchPlaces } from '@/lib/places/nominatim';

const querySchema = z.string().trim().min(3, 'Escribe al menos 3 letras').max(120);

export async function GET(req: Request) {
  const q = querySchema.safeParse(new URL(req.url).searchParams.get('q') ?? '');
  if (!q.success) return err('INVALID_INPUT', q.error.issues[0].message);
  try {
    return ok(await searchPlaces(q.data, `Astrolabio-demo/0.1 (+${siteUrl()})`));
  } catch (e) {
    console.error('[api/places]', e instanceof Error ? e.message : 'unknown error');
    return err('PLACES_ERROR', 'No se pudo buscar el lugar. Inténtalo de nuevo en unos segundos.', 502);
  }
}
