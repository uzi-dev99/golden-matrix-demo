import type { BirthInput, NatalChart } from './natal';

export const TONES = ['neutral', 'warm', 'clinical'] as const;
export const LENGTHS = ['short', 'medium', 'long'] as const;

export interface PromptOptions {
  tone: (typeof TONES)[number];
  length: (typeof LENGTHS)[number];
}

/** POST /api/report and POST /api/prompt/preview body. The server recomputes the chart. */
export interface ReportRequest {
  input: BirthInput;
  options: PromptOptions;
  model: string; // must be in the server allow-list
}

/** A piece of a rendered prompt; `token` is set when the text was injected into a `{{token}}`. */
export interface PromptSegment {
  text: string;
  token?: string;
}

export interface PromptPreview {
  version: string;
  system: PromptSegment[];
  user: PromptSegment[];
  estimatedTokens: number; // ceil(chars / 4), before the run
}

export interface ReportMeta {
  model: string; // model id requested
  servedModel?: string; // model that answered (differs for openrouter/free)
  latencyMs: number; // request start -> last chunk
  firstTokenMs?: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd?: number;
  generationId?: string;
  promptVersion: string;
  usageEstimated?: boolean; // true when the provider sent no usage chunk (chars/4 estimate)
}

/** Server -> client events of POST /api/report (SSE, one JSON object per `data:` line). */
export type ReportEvent =
  | { type: 'delta'; text: string }
  | { type: 'meta'; meta: ReportMeta }
  | { type: 'error'; code: ErrorCode; message: string };

export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  free: boolean;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'INVALID_CREDENTIALS'
  | 'MODEL_NOT_ALLOWED'
  | 'RATE_LIMITED'
  | 'LLM_ERROR'
  | 'EMPTY_COMPLETION'
  | 'PLACES_ERROR'
  | 'INTERNAL';

/** What /print and /resultado share through sessionStorage. */
export interface StoredSession {
  input?: BirthInput;
  chart?: NatalChart;
  report?: string; // markdown, sections start with "## "
  meta?: ReportMeta;
}
