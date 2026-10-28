'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/session-store';
import { Mark } from './Mark';

export function AppHeader({ user }: { user: string }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    clearSession();
    router.replace('/login');
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line py-3">
      <Link href="/" className="flex items-center gap-2 text-ink no-underline">
        <Mark />
        <span className="text-[15px] font-semibold">Astrolabio</span>
      </Link>
      <nav aria-label="Principal" className="flex items-center gap-4 text-[13px] text-muted">
        <span>Sesión: {user}</span>
        <button type="button" onClick={logout} className="btn btn-secondary">
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}
