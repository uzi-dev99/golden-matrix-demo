import { NextResponse } from 'next/server';
import type { z } from 'zod';
import type { ErrorCode } from '@/lib/types';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true as const, data }, { status });
}

export function err(code: ErrorCode, message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ ok: false as const, error: { code, message } }, { status, headers });
}

/** Logs the error object, never the request data; the client only gets a reference. */
export function internalError(error: unknown, scope: string) {
  const ref = Math.random().toString(36).slice(2, 10);
  console.error(`[${scope}] ref=${ref}`, error instanceof Error ? error.message : 'unknown error');
  return err('INTERNAL', `Error interno (ref ${ref})`, 500);
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, res: err('INVALID_INPUT', 'Cuerpo JSON inválido') };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, res: err('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Datos inválidos') };
  }
  return { ok: true, data: parsed.data };
}
