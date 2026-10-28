import { describe, expect, test } from 'vitest';
import { createSseParser } from './sse';

describe('createSseParser', () => {
  test('AC10 — events split across chunks, comments ignored', () => {
    const feed = createSseParser();
    expect(feed(': OPENROUTER PROCESSING\n\ndata: {"a"')).toEqual([]);
    expect(feed(':1}\n\ndata: [DO')).toEqual(['{"a":1}']);
    expect(feed('NE]\n\n')).toEqual(['[DONE]']);
  });
  test('AC10 — CRLF and two events in one chunk', () => {
    const feed = createSseParser();
    expect(feed('data: 1\r\n\r\ndata: 2\r\n\r\n')).toEqual(['1', '2']);
  });
});
