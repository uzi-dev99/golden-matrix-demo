import type { BirthInput, NatalPlace, StoredSession } from '@/lib/types';

const KEY = 'astrolabio:v1';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null; // storage blocked
  }
}

export function loadSession(store: Store | null = defaultStore()): StoredSession {
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as StoredSession) : {};
  } catch {
    return {};
  }
}

function samePlace(a: NatalPlace | undefined, b: NatalPlace | undefined): boolean {
  if (!a || !b) return a === b;
  return a.label === b.label && a.latitude === b.latitude && a.longitude === b.longitude && a.timezone === b.timezone;
}

/** Field by field, so the same birth data in another key order is not a new input. */
function sameInput(a: BirthInput | undefined, b: BirthInput | undefined): boolean {
  if (!a || !b) return a === b;
  return a.name === b.name && a.date === b.date && a.time === b.time && samePlace(a.place, b.place);
}

/** Merges `patch` into the stored session. A changed `input` drops the derived chart, report and meta. */
export function patchSession(patch: StoredSession, store: Store | null = defaultStore()): StoredSession {
  const current = loadSession(store);
  const inputChanged = !!patch.input && !sameInput(patch.input, current.input);
  const next: StoredSession = inputChanged ? { ...patch } : { ...current, ...patch };
  try {
    store?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota or blocked: the app keeps working without persistence */
  }
  return next;
}

export function clearSession(store: Store | null = defaultStore()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
