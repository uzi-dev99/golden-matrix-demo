import { describe, expect, test } from 'vitest';
import { clientIp } from './http';

const req = (xff?: string) => new Request('http://x', { headers: xff ? { 'x-forwarded-for': xff } : {} });

describe('clientIp', () => {
  test('AC10 — one trusted hop uses the last entry, so a spoofed left entry is ignored', () => {
    expect(clientIp(req('1.1.1.1, 9.9.9.9'), 1)).toBe('9.9.9.9');
  });
  test('AC10 — two hops use the second-to-last', () => {
    expect(clientIp(req('1.1.1.1, 2.2.2.2, 3.3.3.3'), 2)).toBe('2.2.2.2');
  });
  test('AC10 — no header is "unknown"; hops larger than the list use the first', () => {
    expect(clientIp(req(), 1)).toBe('unknown');
    expect(clientIp(req('5.5.5.5'), 3)).toBe('5.5.5.5');
  });
  test('AC10 — without a trusted proxy the header is ignored, so the quota cannot be bypassed', () => {
    expect(clientIp(req('6.6.6.6'), 0)).toBe('unknown');
    expect(clientIp(req('6.6.6.6, 7.7.7.7'), 0)).toBe('unknown');
    expect(clientIp(req('6.6.6.6'), 1)).toBe('6.6.6.6');
  });
});
