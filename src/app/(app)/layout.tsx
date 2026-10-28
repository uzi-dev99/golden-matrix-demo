import { cookies } from 'next/headers';
import { AppHeader } from '@/components/shell/AppHeader';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { sessionSecret } from '@/lib/config';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, sessionSecret());

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4">
      <AppHeader user={session?.user ?? 'demo'} />
      {children}
    </div>
  );
}
