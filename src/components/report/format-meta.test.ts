import { describe, expect, test } from 'vitest';
import { formatCost, formatMs, formatTokens } from './format-meta';

describe('format-meta', () => {
  test('AC12 — milliseconds as Spanish seconds with a comma', () => {
    expect(formatMs(9800)).toBe('9,8 s');
    expect(formatMs(1200)).toBe('1,2 s');
    expect(formatMs(0)).toBe('0,0 s');
  });
  test('AC12 — tokens are grouped with a thin space', () => {
    expect(formatTokens(1304)).toBe('1\u2009304');
    expect(formatTokens(586)).toBe('586');
    expect(formatTokens(1234567)).toBe('1\u2009234\u2009567');
  });
  test('AC12 — a free or zero cost is 0 US$; an unknown cost is a dash', () => {
    expect(formatCost(0.0012, true)).toBe('0 US$');
    expect(formatCost(0, false)).toBe('0 US$');
    expect(formatCost(undefined, false)).toBe('—');
    expect(formatCost(0.0012, false)).toBe('US$ 0,0012');
  });
});
