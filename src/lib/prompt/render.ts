import type { PromptSegment } from '@/lib/types';

const TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Splits a template into literal and injected segments. Throws on a token without a value. */
export function renderSegments(template: string, vars: Record<string, string>): PromptSegment[] {
  const out: PromptSegment[] = [];
  let last = 0;
  for (const m of template.matchAll(TOKEN)) {
    const token = m[1];
    if (!(token in vars)) throw new Error(`Missing prompt variable: ${token}`);
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ text: vars[token], token });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
}

export const segmentsToText = (segments: PromptSegment[]): string => segments.map((s) => s.text).join('');

/** The delimiters of a fenced block. A value never contains them. */
export const FENCE_DELIMITERS = /<<<|>>>/g;

/**
 * Wraps a user-controlled value as data: one line inside a delimited block, so it cannot close the
 * block, nor start a line of its own (a "## " would become a heading of the report).
 */
export const fence = (value: string): string =>
  `<<< ${value.replace(FENCE_DELIMITERS, '').replace(/\s+/g, ' ').trim()} >>>`;

/** Pre-run estimate only; the real count comes from the provider's `usage` chunk. */
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);
