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
  test('AC10 — models whose provider has no key are left out: MiniMax on the LAN, OpenRouter online', () => {
    vi.stubEnv('OPENROUTER_MODELS', 'minimax/MiniMax-M3.1-Flash,openrouter/free');
    vi.stubEnv('MINIMAX_API_KEY', '');
    vi.stubEnv('OPENROUTER_API_KEY', 'x');
    expect(allowedModels()).toEqual(['openrouter/free']);
    vi.stubEnv('MINIMAX_API_KEY', 'y');
    expect(defaultModel()).toBe('minimax/MiniMax-M3.1-Flash');
    vi.stubEnv('OPENROUTER_API_KEY', '');
    expect(allowedModels()).toEqual(['minimax/MiniMax-M3.1-Flash']);
    vi.stubEnv('MINIMAX_API_KEY', '');
    expect(allowedModels()).toEqual(['minimax/MiniMax-M3.1-Flash', 'openrouter/free']); // no key at all: clear error later
  });
  test('D10 — an empty TRUSTED_PROXY_HOPS means the default, 0 is respected', () => {
    vi.stubEnv('TRUSTED_PROXY_HOPS', '');
    expect(trustedProxyHops()).toBe(1);
    vi.stubEnv('TRUSTED_PROXY_HOPS', '0');
    expect(trustedProxyHops()).toBe(0);
  });
});
