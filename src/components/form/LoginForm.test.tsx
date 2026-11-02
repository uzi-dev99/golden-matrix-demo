import { describe, expect, test, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginForm, postLogin } from './LoginForm';

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

  test('AC2 — the form posts the credentials to the same login endpoint as before', async () => {
    const calls: [string, RequestInit][] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push([url, init]);
      return { ok: true, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const res = await postLogin({ user: 'demo', password: 'astrolabio-demo' }, fakeFetch);

    expect(res).toEqual({ ok: true, error: '' });
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('/api/login');
    expect(calls[0][1].method).toBe('POST');
    expect(JSON.parse(String(calls[0][1].body))).toEqual({ user: 'demo', password: 'astrolabio-demo' });
  });

  test('AC2 — a rejected login shows the message the API returns', async () => {
    const fakeFetch = (async () => ({
      ok: false,
      json: async () => ({ error: { message: 'Usuario o contraseña incorrectos' } }),
    })) as unknown as typeof fetch;

    const res = await postLogin({ user: 'demo', password: 'nope' }, fakeFetch);

    expect(res).toEqual({ ok: false, error: 'Usuario o contraseña incorrectos' });
  });
});
