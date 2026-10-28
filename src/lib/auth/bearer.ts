import { err } from '@/lib/api/envelope';
import { sessionSecret } from '@/lib/config';
import { verifySession } from './session';

/** The public API's auth: `Authorization: Bearer <token from /api/v1/auth/token>`. Null when valid. */
export async function requireBearer(req: Request) {
  const header = req.headers.get('authorization') ?? '';
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (token && (await verifySession(token, sessionSecret()))) return null;
  return err('UNAUTHORIZED', 'Falta un token válido: pídelo en POST /api/v1/auth/token', 401, { 'WWW-Authenticate': 'Bearer' });
}
