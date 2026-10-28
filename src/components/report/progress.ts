/** The report's sections, in the order the system template asks for (pinned by progress.test.ts). */
export const REPORT_SECTIONS = [
  'Visión general',
  'Sol, Luna y Ascendente',
  'Planetas y casas',
  'Aspectos principales',
  'Síntesis',
] as const;

export type SectionState = 'done' | 'active' | 'pending';

/** State of each expected section, from the headings already present in the streamed text. */
export function sectionStates(text: string, finished: boolean): SectionState[] {
  const seen = REPORT_SECTIONS.map((title) => new RegExp(`^## +${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(text));
  const last = seen.lastIndexOf(true);
  return REPORT_SECTIONS.map((_, i) => {
    if (finished && seen[i]) return 'done';
    if (i < last) return 'done';
    if (i === last || (last < 0 && i === 0)) return 'active';
    return 'pending';
  });
}

/**
 * How many characters to show next frame. The network delivers text in bursts; revealing it at a
 * steady pace that speeds up with the backlog keeps the typing fluid and never lags more than ~0.5 s.
 */
export function nextShown(shown: number, target: number, dtMs: number): number {
  if (shown >= target) return target;
  const backlog = target - shown;
  const perSecond = Math.max(90, backlog * 2);
  return Math.min(target, shown + Math.max(1, Math.round((perSecond * dtMs) / 1000)));
}
