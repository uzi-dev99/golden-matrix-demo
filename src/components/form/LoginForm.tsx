'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Posts the demo credentials to the login API. Exported so the endpoint is pinned by a test. */
export async function postLogin(
  values: { user: string; password: string },
  doFetch: typeof fetch = fetch,
): Promise<{ ok: boolean; error: string }> {
  const res = await doFetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { ok: false, error: body?.error?.message ?? 'No se pudo iniciar sesión' };
  }
  return { ok: true, error: '' };
}

export function LoginForm({ user, password }: { user: string; password: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ user: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await postLogin(values);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace('/');
    } catch {
      setError('No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="hero__form" aria-label="Acceso a la demo" noValidate>
        <div className="hero__field">
          <label htmlFor="u">Usuario</label>
          <input
            id="u"
            name="user"
            className="hero__input"
            autoComplete="username"
            placeholder="Usuario"
            value={values.user}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setValues((v) => ({ ...v, user: e.target.value }))}
          />
        </div>
        <div className="hero__field">
          <label htmlFor="p">Contraseña</label>
          <input
            id="p"
            name="password"
            type="password"
            className="hero__input"
            autoComplete="current-password"
            placeholder="Contraseña"
            value={values.password}
            aria-invalid={error ? true : undefined}
            aria-describedby="perr"
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
        </div>
        {error && (
          <p id="perr" role="alert" className="hero__error">
            {error}
          </p>
        )}
        <button type="submit" className="hero__btn hero__btn--solid" disabled={busy}>
          Entrar
        </button>
      </form>

      <p className="hero__note">
        Credenciales de la demo · usuario <code>{user}</code> · contraseña <code>{password}</code>
      </p>
      <button type="button" className="btn-text hero__aside" onClick={() => setValues({ user, password })}>
        Rellenar los campos
      </button>

      <p className="hero__note">
        La carta y el informe también se generan con un token:{' '}
        <a className="hero__textlink" href="/docs">
          documentación de la API
        </a>
        .
      </p>
    </>
  );
}
