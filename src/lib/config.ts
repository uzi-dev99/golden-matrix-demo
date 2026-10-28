// The only reader of process.env. Every value is read on first use, never at import,
// so `next build` works without any environment.

const DEFAULT_MODELS = [
  // Default: a free, non-reasoning model (openrouter/free can route to a reasoning
  // model and return an empty report).
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
  'google/gemma-4-31b-it:free',
];

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name}`);
  return v;
}

function int(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function sessionSecret(): string {
  const v = required('SESSION_SECRET');
  if (v.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return v;
}

export function demoCredentials(): { user: string; password: string } {
  return { user: process.env.DEMO_USER || 'demo', password: required('DEMO_PASSWORD') };
}

export function openRouterKey(): string {
  return required('OPENROUTER_API_KEY');
}

/** Models served by MiniMax's own API use this prefix in the allow-list (`minimax/MiniMax-M3.1-Flash`). */
export const MINIMAX_PREFIX = 'minimax/';

export function minimaxKey(): string {
  return required('MINIMAX_API_KEY');
}

/**
 * Allow-list of model ids (OpenRouter ids, or `minimax/<model>`); the first entry is the default.
 * A model whose provider has no key in this environment is left out, so one list serves a LAN run
 * with MiniMax and an online run with OpenRouter only.
 */
export function allowedModels(): string[] {
  const raw = process.env.OPENROUTER_MODELS;
  const list = (raw ? raw.split(',') : DEFAULT_MODELS).map((s) => s.trim()).filter(Boolean);
  const usable = list.filter((id) => (id.startsWith(MINIMAX_PREFIX) ? !!process.env.MINIMAX_API_KEY : !!process.env.OPENROUTER_API_KEY));
  // With no key at all keep the list: the report then fails with a clear "not configured" error.
  return usable.length ? usable : list.length ? list : DEFAULT_MODELS;
}

export function defaultModel(): string {
  return allowedModels()[0];
}

export function siteUrl(): string {
  return process.env.SITE_URL || 'http://localhost:3100';
}

/** True only when SITE_URL is set explicitly to a plain-http URL (a LAN or localhost run). */
export function plainHttpSite(): boolean {
  return /^http:\/\//i.test((process.env.SITE_URL ?? '').trim());
}

export function rateLimitPerHour(): number {
  return int('RATE_LIMIT_PER_HOUR', 20);
}

export function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS;
  if (raw === undefined || raw.trim() === '') return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 1;
}

export const APP_NAME = 'Astrolabio';
