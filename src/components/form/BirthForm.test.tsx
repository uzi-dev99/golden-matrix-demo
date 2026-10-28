import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BirthForm } from './BirthForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

describe('BirthForm', () => {
  test('AC9 — every control has an associated label', () => {
    const html = renderToStaticMarkup(<BirthForm />);
    for (const id of ['nombre', 'fecha', 'hora', 'lugar', 'zona']) {
      expect(html).toContain(`for="${id}"`);
      expect(html).toContain(`id="${id}"`);
    }
  });

  test('AC9 — the submit button stays disabled until the form is complete', () => {
    const html = renderToStaticMarkup(<BirthForm />);
    expect(html).toContain('Calcular carta');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Calcular carta/);
  });

  test('AC8 — the birth form holds exactly one form element', () => {
    // A nested form is invalid HTML: the browser drops it and the page breaks (React #418).
    const html = renderToStaticMarkup(<BirthForm />);
    expect(html.match(/<form/g)?.length).toBe(1);
  });

  test('AC-visual — the form rows do not stretch: the fields keep the 16px rhythm of the mock', () => {
    const html = renderToStaticMarkup(<BirthForm />);
    const formClass = html.match(/<form[^>]*class="([^"]*)"/)?.[1] ?? '';
    expect(formClass).toContain('content-start');
  });

  test('AC8 — the place and the time zone are announced', () => {
    const html = renderToStaticMarkup(<BirthForm />);
    expect(html).toContain('Elige un lugar');
    expect(html).toContain('colaboradores de OpenStreetMap');
  });
});
