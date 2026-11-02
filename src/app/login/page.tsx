import { LoginForm } from '@/components/form/LoginForm';
import { HeroNav } from '@/components/login/HeroNav';
import { POSTER_URL, VIDEO_URL } from '@/components/login/media';
import { demoCredentials } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const creds = demoCredentials();

  return (
    <main className="hero">
      <HeroNav />

      <div className="hero__media" style={{ backgroundImage: `url(${POSTER_URL})` }}>
        <video autoPlay muted loop playsInline preload="auto" poster={POSTER_URL} src={VIDEO_URL} aria-hidden="true" />
      </div>

      <div className="hero__body">
        <div className="hero__panel" id="entrar">
          <p className="hero__chip">[ Entrar a la demo ]</p>
          <h1 className="hero__title">Astrolabio</h1>
          <p className="hero__tagline">Una carta natal, un prompt visible y un informe en directo.</p>
          <LoginForm user={creds.user} password={creds.password} />
        </div>
      </div>

      <footer className="hero__legal">
        Entrar en la demo de Astrolabio implica que aceptas el{' '}
        <a href="#privacidad">aviso de privacidad</a> y las <a href="#condiciones">condiciones de servicio</a>.
      </footer>
    </main>
  );
}
