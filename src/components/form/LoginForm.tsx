'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? 'No se pudo iniciar sesión');
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
    <section className="panel" aria-labelledby="login-title">
      <h2 id="login-title" className="mb-4 text-lg font-semibold">Entrar a la demo</h2>

      <div className="mb-5 rounded-[6px] bg-brass-soft p-4">
        <b>Credenciales de la demo</b>
        <p className="mt-1 text-[13px]">
          Usuario <code className="font-mono">{user}</code> · contraseña <code className="font-mono">{password}</code>
        </p>
        <button type="button" className="btn btn-text mt-2" onClick={() => setValues({ user, password })}>
          Rellenar los campos
        </button>
      </div>

      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="field">
          <label htmlFor="u">Usuario</label>
          <input
            id="u"
            className="input"
            autoComplete="username"
            value={values.user}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setValues((v) => ({ ...v, user: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="p">Contraseña</label>
          <input
            id="p"
            type="password"
            className="input"
            autoComplete="current-password"
            aria-describedby="perr"
            value={values.password}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
          />
        </div>
        {error && (
          <p id="perr" role="alert" className="error-text">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          Entrar
        </button>
      </form>

      <p className="hint mt-4">
        Sin cuentas reales ni base de datos: la sesión es una cookie firmada que caduca en 8 horas.
      </p>
      <p className="hint mt-2">
        ¿Prefieres la API? La carta y el informe también se generan con un token:{' '}
        <a href="/docs" className="text-ink underline">
          documentación de la API
        </a>
        .
      </p>
    </section>
  );
}
