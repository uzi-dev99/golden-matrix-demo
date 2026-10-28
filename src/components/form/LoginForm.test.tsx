import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginForm } from './LoginForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

describe('LoginForm', () => {
  test('AC9 — every field has a label and the demo credentials can be filled', () => {
    const html = renderToStaticMarkup(<LoginForm user="demo" password="astrolabio-demo" />);
    expect(html).toContain('for="u"');
    expect(html).toContain('for="p"');
    expect(html).toContain('Rellenar los campos');
    expect(html).toContain('autoComplete="username"');
    expect(html).toContain('autoComplete="current-password"');
  });

  test('AC-visual — "Rellenar los campos" is a text link, not a grey button', () => {
    const html = renderToStaticMarkup(<LoginForm user="demo" password="astrolabio-demo" />);
    expect(html).toMatch(/<button[^>]*btn-text[^>]*>Rellenar los campos/);
    expect(html).not.toMatch(/<button[^>]*btn-secondary[^>]*>Rellenar los campos/);
  });

  test('AC7 — no error is shown before the user tries to log in', () => {
    const html = renderToStaticMarkup(<LoginForm user="demo" password="astrolabio-demo" />);
    expect(html).not.toContain('role="alert"');
  });
});
