import { beforeEach, describe, expect, test } from 'vitest';
import { __resetRateLimitForTests, takeToken } from './rate-limit';

beforeEach(() => __resetRateLimitForTests());

describe('rate limit', () => {
  test('AC10 — allows `limit` calls, then reports seconds to wait; other IPs unaffected; window reopens', () => {
    for (let i = 0; i < 3; i++) expect(takeToken('a', 3, 1000)).toBe(0);
    expect(takeToken('a', 3, 1000)).toBe(3600);
    expect(takeToken('b', 3, 1000)).toBe(0);
    expect(takeToken('a', 3, 1000 + 3_600_000)).toBe(0);
  });
});
