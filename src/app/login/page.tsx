import { NatalWheel } from '@/components/astrology/NatalWheel';
import { LoginForm } from '@/components/form/LoginForm';
import { Mark } from '@/components/shell/Mark';
import { demoCredentials } from '@/lib/config';
import { calculateNatalChart } from '@/lib/natal';

export const dynamic = 'force-dynamic';

// An invented person; the wheel on this screen is only the demo's picture of a chart.
const SAMPLE = {
  name: 'Elena Prueba',
  date: '1990-05-17',
  time: '14:30',
  place: { label: 'Madrid, España', latitude: 40.416775, longitude: -3.70379, timezone: 'Europe/Madrid' },
};

export default function LoginPage() {
  const creds = demoCredentials();
  const chart = calculateNatalChart(SAMPLE);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-16">
      <header className="flex items-center gap-2 py-4">
        <Mark />
        <span className="font-semibold">Astrolabio</span>
      </header>

      <div className="grid gap-8 lg:grid-cols-[7fr_5fr] lg:gap-16">
        <section>
          <h1 className="max-w-[15em] text-[clamp(34px,4.2vw,56px)] font-semibold leading-[1.02] tracking-[-0.035em]">
            Una carta natal, un prompt visible y un informe en directo.
          </h1>
          <p className="mt-5 max-w-[34em] text-lg leading-relaxed">
            Astrolabio calcula la carta en el servidor, te muestra exactamente qué se le envía al modelo y escribe el
            informe en streaming, con el modelo, la latencia y los tokens a la vista.
          </p>
          <div className="mt-7 flex flex-wrap gap-7">
            <div>
              <b className="block text-3xl font-semibold leading-tight">10</b>
              <span className="text-muted">planetas y 12 casas calculados</span>
            </div>
            <div>
              <b className="block text-3xl font-semibold leading-tight">3</b>
              <span className="text-muted">modelos gratuitos a elegir</span>
            </div>
            <div>
              <b className="block text-3xl font-semibold leading-tight">0</b>
              <span className="text-muted">bases de datos</span>
            </div>
          </div>
          <div className="mt-9 max-w-[520px]">
            <NatalWheel chart={chart} size={520} />
          </div>
        </section>

        <LoginForm user={creds.user} password={creds.password} />
      </div>
    </main>
  );
}
