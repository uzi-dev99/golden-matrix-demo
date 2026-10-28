'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PrintDocument } from '@/components/print/PrintDocument';
import { loadSession } from '@/lib/session-store';
import type { StoredSession } from '@/lib/types';
import './print.css';

export default function PrintPage() {
  const [session, setSession] = useState<StoredSession | null>(null);
  useEffect(() => setSession(loadSession()), []);

  if (!session) return null;
  if (!session.chart) {
    return (
      <main className="wrap" style={{ padding: 32 }}>
        <p>No hay una carta para imprimir. Calcula una primero.</p>
        <Link className="btn btn-primary" href="/">Ir al formulario</Link>
      </main>
    );
  }
  return (
    <main className="wrap">
      <div className="print-bar no-print">
        <Link className="btn btn-secondary" href="/resultado">Volver al informe</Link>
        <button className="btn btn-primary" onClick={() => window.print()}>Imprimir o guardar PDF</button>
      </div>
      <PrintDocument session={session} />
    </main>
  );
}
