import { demoCredentials, sessionSecret } from '@/lib/config';
import { err, internalError, ok, parseBody } from '@/lib/api/envelope';
import { SESSION_MAX_AGE_SEC, signSession } from '@/lib/auth/session';
import { tokenRequestSchema } from '@/lib/api/v1-schemas';

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, tokenRequestSchema);
    if (!body.ok) return body.res;
    const creds = demoCredentials();
    if (body.data.user !== creds.user || body.data.password !== creds.password) {
      return err('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos', 401);
    }
    const token = await signSession(creds.user, sessionSecret());
    return ok({ access_token: token, token_type: 'Bearer', expires_in: SESSION_MAX_AGE_SEC });
  } catch (e) {
    return internalError(e, 'api/v1/auth/token');
  }
}
