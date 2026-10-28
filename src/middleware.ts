import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { sessionSecret } from '@/lib/config';

export async function middleware(req: NextRequest) {
  let secret: string;
  try {
    secret = sessionSecret();
  } catch {
    // Without the secret the app cannot work: say it clearly instead of an opaque 500.
    return NextResponse.json(
      { ok: false, error: { code: 'INTERNAL', message: 'SESSION_SECRET is not configured' } },
      { status: 500 },
    );
  }
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value, secret);
  if (session) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Inicia sesión para continuar' } }, { status: 401 });
  }
  const login = req.nextUrl.clone(); // keeps the public host behind a reverse proxy
  login.pathname = '/login';
  login.search = '';
  return NextResponse.redirect(login);
}

// Everything except the login page, its API and Next internals.
export const config = {
  matcher: ['/((?!login|api/login|api/logout|_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
