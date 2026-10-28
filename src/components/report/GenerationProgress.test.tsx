import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { GenerationProgress } from './GenerationProgress';

describe('GenerationProgress', () => {
  test('the elapsed clock is hidden from assistive tech, so the live region is announced once', () => {
    const html = renderToStaticMarkup(
      <GenerationProgress waiting text="" elapsedMs={1200} model="openrouter/free" />,
    );
    expect(html).toMatch(/role="status"/);
    expect(html).toMatch(/Enviando el prompt a openrouter\/free/);
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>1,2 s<\/span>/);
  });
  test('the checklist is a list whose items expose their state', () => {
    const html = renderToStaticMarkup(
      <GenerationProgress
        waiting={false}
        text={'## Visión general\nTexto\n## Sol, Luna y Ascendente'}
        elapsedMs={1200}
        model="openrouter/free"
      />,
    );
    expect(html).toMatch(/<ol[^>]*role="list"/);
    expect(html).toContain('completada');
    expect(html).toContain('en curso');
    expect(html).toContain('pendiente');
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  });
});
