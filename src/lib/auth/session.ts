// Signed cookie "base64url(payload).base64url(HMAC-SHA256)". Web Crypto only, so the same code
// runs in the middleware (edge) and in route handlers (node).
export const SESSION_COOKIE = 'astrolabio_session';
const MAX_AGE_SEC = 60 * 60 * 8;

export interface SessionPayload {
  user: string;
  exp: number; // epoch seconds
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function hmacKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

export async function signSession(user: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ user, exp: nowSec + MAX_AGE_SEC } satisfies SessionPayload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, 'sign'), enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra !== undefined) return null;
  try {
    // subtle.verify compares in constant time
    const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret, 'verify'), fromB64url(sig), enc.encode(payload));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as SessionPayload;
    return typeof data.user === 'string' && data.exp > nowSec ? data : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE_SEC,
};
