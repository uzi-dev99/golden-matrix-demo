import { splitSections } from '@/lib/sections';
import type { StoredSession } from '@/lib/types';

export type PrintPage = { kind: 'cover' } | { kind: 'positions' } | { kind: 'section'; title: string; body: string };

/** Cover and positions always; one page per report section when a report exists (AC14: works without one). */
export function buildPages(s: StoredSession): PrintPage[] {
  if (!s.chart) return [];
  const pages: PrintPage[] = [{ kind: 'cover' }, { kind: 'positions' }];
  for (const sec of splitSections(s.report ?? '')) pages.push({ kind: 'section', ...sec });
  return pages;
}
