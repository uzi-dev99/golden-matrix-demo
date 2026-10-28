// shortcut: fixed window per IP in this process's memory; with several replicas the limit multiplies, use a shared store then.
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, { start: number; count: number }>();

export function __resetRateLimitForTests(): void {
  hits.clear();
}

/** Returns 0 when allowed, otherwise the seconds until the window reopens. */
export function takeToken(ip: string, limit: number, now = Date.now()): number {
  const h = hits.get(ip);
  if (!h || now - h.start >= WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return 0;
  }
  if (h.count >= limit) return Math.ceil((h.start + WINDOW_MS - now) / 1000);
  h.count += 1;
  return 0;
}
