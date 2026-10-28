import { err } from '@/lib/api/envelope';
import { sessionSecret } from '@/lib/config';
import { verifySession } from './session';

/** The public API's auth: `Authorization: Bearer <token from /api/v1/auth/token>`. Null when valid. */
export async function requireBearer(req: Request) {
  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    // Without the secret no token can be verified: say it clearly instead of an opaque 500.
    return err('INTERNAL', 'SESSION_SECRET is not configured', 500);
  }
  const header = req.headers.get('authorization') ?? '';
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (token && (await verifySession(token, secret))) return null;
  return err('UNAUTHORIZED', 'Falta un token válido: pídelo en POST /api/v1/auth/token', 401, { 'WWW-Authenticate': 'Bearer' });
}
