import { cookies } from 'next/headers';
import { HeroMedia } from '@/components/login/HeroMedia';
import { AppHeader } from '@/components/shell/AppHeader';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';
import { sessionSecret } from '@/lib/config';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token, sessionSecret());

  return (
    <div className="app-shell">
      {/* The same media as the login hero, fixed behind the content and dimmed by a dark scrim. */}
      <HeroMedia className="hero__media--ambient" />
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4">
        <AppHeader user={session?.user ?? 'demo'} />
        {children}
      </div>
    </div>
  );
}
