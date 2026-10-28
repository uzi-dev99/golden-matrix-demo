import { describe, expect, test } from 'vitest';
import type { BirthInput, NatalChart } from '@/lib/types';
import { clearSession, loadSession, patchSession } from './session-store';

function fakeStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
const input = (name: string): BirthInput => ({
  name,
  date: '1990-05-17',
  time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.4168, longitude: -3.7038, timezone: 'Europe/Madrid' },
});

describe('session-store', () => {
  test('AC14 — empty store loads {}', () => {
    expect(loadSession(fakeStore())).toEqual({});
    expect(loadSession(null)).toEqual({});
  });
  test('AC14 — patch merges; a changed input drops derived data', () => {
    const s = fakeStore();
    patchSession({ input: input('Ana') }, s);
    patchSession({ chart: { warnings: [] } as unknown as NatalChart, report: '## Hola' }, s);
    expect(loadSession(s).report).toBe('## Hola');
    patchSession({ input: input('Ana') }, s); // same input: keeps the report
    expect(loadSession(s).report).toBe('## Hola');
    patchSession({ input: input('Luis') }, s); // new input: starts over
    expect(loadSession(s)).toEqual({ input: input('Luis') });
  });
  test('AC14 — the same input with the keys in another order keeps the report', () => {
    const s = fakeStore();
    patchSession({ input: input('Ana') }, s);
    patchSession({ report: '## Hola' }, s);
    patchSession({ input: { place: { timezone: 'Europe/Madrid', longitude: -3.7038, latitude: 40.4168, label: 'Madrid, España' }, time: '14:30', date: '1990-05-17', name: 'Ana' } }, s);
    expect(loadSession(s).report).toBe('## Hola');
  });
  test('AC14 — a stored input without a place does not break the patch', () => {
    for (const stored of [{ name: 'Ana', date: '1990-05-17', time: '14:30' }, { name: 'Ana', date: '1990-05-17', time: '14:30', place: null }]) {
      const s = fakeStore();
      s.setItem('astrolabio:v1', JSON.stringify({ input: stored }));
      expect(() => patchSession({ input: input('Ana') }, s)).not.toThrow();
      expect(loadSession(s).input?.place?.timezone).toBe('Europe/Madrid');
    }
  });
  test('AC14 — a non-object in storage loads as {}', () => {
    const s = fakeStore();
    s.setItem('astrolabio:v1', 'null');
    expect(loadSession(s)).toEqual({});
    s.setItem('astrolabio:v1', '42');
    expect(loadSession(s)).toEqual({});
  });
  test('AC14 — corrupt JSON and clear', () => {
    const s = fakeStore();
    s.setItem('astrolabio:v1', '{oops');
    expect(loadSession(s)).toEqual({});
    patchSession({ input: input('Ana') }, s);
    clearSession(s);
    expect(loadSession(s)).toEqual({});
  });
});
