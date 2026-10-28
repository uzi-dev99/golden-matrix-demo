import { describe, expect, test } from 'vitest';
import { splitSections } from './sections';

describe('splitSections', () => {
  test('AC13 — splitSections cuts at "## " and drops the preamble', () => {
    expect(splitSections('intro\n## Uno\ncuerpo\n## Dos\nmás')).toEqual([
      { title: 'Uno', body: 'cuerpo' },
      { title: 'Dos', body: 'más' },
    ]);
    expect(splitSections('sin secciones')).toEqual([]);
    expect(splitSections('## Solo título')).toEqual([{ title: 'Solo título', body: '' }]);
  });
});
