import { NextResponse } from 'next/server';
import { z } from 'zod';
import { demoCredentials, sessionSecret } from '@/lib/config';
import { err, internalError, parseBody } from '@/lib/api/envelope';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/auth/session';

const bodySchema = z.object({ user: z.string().min(1).max(80), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, bodySchema);
    if (!body.ok) return body.res;
    const creds = demoCredentials();
    if (body.data.user !== creds.user || body.data.password !== creds.password) {
      return err('INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos', 401);
    }
    const res = NextResponse.json({ ok: true, data: { user: creds.user } });
    res.cookies.set(SESSION_COOKIE, await signSession(creds.user, sessionSecret()), sessionCookieOptions);
    return res;
  } catch (e) {
    return internalError(e, 'api/login');
  }
}
