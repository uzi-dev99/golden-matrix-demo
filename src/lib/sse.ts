/**
 * Incremental SSE reader: feed it text chunks, get the `data:` payloads of every complete event.
 * Comment lines (": OPENROUTER PROCESSING") and other fields are ignored; a chunk may end mid-line.
 */
export function createSseParser(): (chunk: string) => string[] {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? '';
    const out: string[] = [];
    for (const ev of events) {
      const data = ev
        .split(/\r?\n/)
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n');
      if (data) out.push(data);
    }
    return out;
  };
}

/** Writes into a stream controller that may be closed already (the client disconnected): it must not throw. */
export function safeStream(fn: () => void): void {
  try {
    fn();
  } catch (e) {
    // Only the closed-controller error is expected here; any other one is a bug of the caller.
    if (!(e instanceof TypeError)) throw e;
  }
}
