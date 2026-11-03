import { BirthForm } from '@/components/form/BirthForm';

export default function HomePage() {
  return (
    <main className="motion-rise pb-12 pt-6" style={{ '--motion-delay': '80ms' } as React.CSSProperties}>
      <h1 className="text-2xl font-light tracking-tight">Datos de nacimiento</h1>
      <BirthForm />
    </main>
  );
}
