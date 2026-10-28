import { afterEach, describe, expect, test, vi } from 'vitest';
import { allowedModels, defaultModel, sessionSecret, trustedProxyHops } from './config';

afterEach(() => vi.unstubAllEnvs());

describe('config', () => {
  test('AC11 — nothing is read at import time', () => {
    expect(() => sessionSecret()).toThrow(/SESSION_SECRET/);
  });
  test('AC11 — SESSION_SECRET needs 32 chars', () => {
    vi.stubEnv('SESSION_SECRET', 'short');
    expect(() => sessionSecret()).toThrow(/32/);
  });
  test('AC10 — default allow-list starts with the nemotron free model', () => {
    expect(defaultModel()).toBe('nvidia/nemotron-3-ultra-550b-a55b:free');
  });
  test('AC10 — env allow-list is trimmed and wins', () => {
    vi.stubEnv('OPENROUTER_MODELS', ' a/b:free , c/d ,');
    expect(allowedModels()).toEqual(['a/b:free', 'c/d']);
  });
  test('D10 — an empty TRUSTED_PROXY_HOPS means the default, 0 is respected', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '');
    expect(trustedProxyHops()).toBe(1);
    vi.stubEnv('TRUSTED_PROXY_HOPS', '0');
    expect(trustedProxyHops()).toBe(0);
  });
});
