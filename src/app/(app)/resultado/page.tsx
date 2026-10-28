'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ResultsView } from '@/components/shell/ResultsView';
import { loadSession, patchSession } from '@/lib/session-store';
import type { BirthInput, NatalChart } from '@/lib/types';

export default function ResultPage() {
  const router = useRouter();
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [input, setInput] = useState<BirthInput | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const session = loadSession();
    const stored = session.input;
    if (!stored) {
      router.replace('/');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stored),
        });
        const body = (await res.json().catch(() => null)) as { data?: NatalChart; error?: { message?: string } } | null;
        if (!res.ok || !body?.data) {
          if (!cancelled) setError(body?.error?.message ?? 'No se pudo calcular la carta');
          return;
        }
        if (cancelled) return;
        patchSession({ chart: body.data });
        setInput(stored);
        setChart(body.data);
      } catch {
        if (!cancelled) setError('No se pudo calcular la carta');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  if (error) {
    return (
      <main className="panel my-6 grid gap-3">
        <p className="error-text" role="alert">
          {error}
        </p>
        <button type="button" className="btn btn-primary justify-self-start" onClick={() => setAttempt((n) => n + 1)}>
          Reintentar
        </button>
      </main>
    );
  }

  if (!chart || !input) {
    return (
      <main className="panel my-6">
        <p>Calculando la carta…</p>
      </main>
    );
  }

  return (
    <main className="py-6">
      <ResultsView input={input} chart={chart} />
    </main>
  );
}
