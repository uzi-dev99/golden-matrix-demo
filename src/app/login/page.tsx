import { LoginForm } from '@/components/form/LoginForm';
import { HeroMedia } from '@/components/login/HeroMedia';
import { HeroNav } from '@/components/login/HeroNav';
import { demoCredentials } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const creds = demoCredentials();

  return (
    <main className="hero">
      {/* The CDN is only used here: the hint belongs to the page that loads the media. */}
      <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" />

      <HeroNav />

      <HeroMedia />

      <div className="hero__body">
        <div className="hero__panel" id="entrar">
          <p className="hero__chip">[ Entrar a la demo ]</p>
          <h1 className="hero__title">Astrolabio</h1>
          <p className="hero__tagline">Una carta natal, un prompt visible y un informe en directo.</p>
          <LoginForm user={creds.user} password={creds.password} />
        </div>
      </div>

      <footer className="hero__legal">
        Entrar en la demo de Astrolabio implica que aceptas el aviso de privacidad y las condiciones de servicio.
      </footer>
    </main>
  );
}
