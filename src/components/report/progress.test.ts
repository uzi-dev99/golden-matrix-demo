import { describe, expect, test } from 'vitest';
import { SYSTEM_TEMPLATE } from '@/lib/prompt/templates/system';
import { REPORT_SECTIONS, nextShown, sectionStates } from './progress';

describe('report progress', () => {
  test('the section list matches the system template', () => {
    for (const title of REPORT_SECTIONS) expect(SYSTEM_TEMPLATE).toContain(`"## ${title}"`);
  });
  test('sections advance with the headings seen so far', () => {
    expect(sectionStates('', false)).toEqual(['active', 'pending', 'pending', 'pending', 'pending']);
    expect(sectionStates('## Visión general\nTexto\n## Sol, Luna y Ascendente\nMás', false)).toEqual([
      'done',
      'active',
      'pending',
      'pending',
      'pending',
    ]);
    const all = REPORT_SECTIONS.map((t) => `## ${t}\nx`).join('\n');
    expect(sectionStates(all, false)[4]).toBe('active');
    expect(sectionStates(all, true)).toEqual(['done', 'done', 'done', 'done', 'done']);
  });
  test('the reveal is steady, catches up with a backlog and never overshoots', () => {
    expect(nextShown(0, 1000, 16)).toBeGreaterThan(nextShown(0, 50, 16));
    expect(nextShown(990, 1000, 1000)).toBe(1000);
    expect(nextShown(10, 10, 16)).toBe(10);
    expect(nextShown(0, 5, 1)).toBe(1);
  });
});
