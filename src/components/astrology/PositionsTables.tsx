import { formatDegree, signAndDegree } from '@/lib/format';
import type { NatalChart } from '@/lib/types';

const ANGLES: Record<number, string> = { 1: 'Ascendente', 4: 'Fondo del cielo', 7: 'Descendente', 10: 'Medio cielo' };

/** Server-safe, shared by /resultado and /print. Numbers are right-aligned; "℞" marks retrograde, "–" its absence. */
export function PlanetsTable({ chart }: { chart: NatalChart }) {
  return (
    <table>
      <caption className="sr-only">Planetas de la carta natal</caption>
      <thead>
        <tr><th scope="col">Planeta</th><th scope="col">Signo</th><th scope="col" className="n">Grado</th><th scope="col" className="n">Casa</th><th scope="col" className="n"><abbr title="Retrógrado">℞</abbr></th></tr>
      </thead>
      <tbody>
        {chart.planets.map((p) => {
          const pos = signAndDegree(p.signEs, p.degree);
          return (
            <tr key={p.key}>
              <td>{p.label}</td><td>{pos.sign}</td><td className="n">{formatDegree(pos.degree)}</td><td className="n">{p.house}</td><td className="n">{p.retrograde ? '℞' : '–'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function HousesTable({ chart }: { chart: NatalChart }) {
  return (
    <table>
      <caption className="sr-only">Cúspides de las casas (Placidus)</caption>
      <thead>
        <tr><th scope="col">Casa</th><th scope="col">Cúspide</th><th scope="col" className="n">Grado</th></tr>
      </thead>
      <tbody>
        {chart.houses.map((h) => {
          const pos = signAndDegree(h.signEs, h.degree);
          return (
            <tr key={h.house}>
              <td>{h.house}{ANGLES[h.house] ? ` · ${ANGLES[h.house]}` : ''}</td><td>{pos.sign}</td><td className="n">{formatDegree(pos.degree)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
