/** Client IP behind `hops` trusted reverse proxies (X-Forwarded-For is appended to by each one). */
export function clientIp(req: Request, hops: number): string {
  // Without a trusted proxy the header comes from the client: never trust it.
  if (hops <= 0) return 'unknown';
  const parts = (req.headers.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return 'unknown';
  // Take the entry added by the outermost trusted proxy; extra spoofed entries sit to its left.
  return parts[Math.max(0, parts.length - Math.max(1, hops))];
}
