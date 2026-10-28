import { BirthForm } from '@/components/form/BirthForm';

export default function HomePage() {
  return (
    <main className="pb-12 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Datos de nacimiento</h1>
      <BirthForm />
    </main>
  );
}
