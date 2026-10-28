'use client';

import { useState } from 'react';
import { NatalWheel } from '@/components/astrology/NatalWheel';
import { HousesTable, PlanetsTable } from '@/components/astrology/PositionsTables';
import { ReportPanel } from '@/components/report/ReportPanel';
import { formatDate } from '@/lib/format';
import type { BirthInput, NatalChart } from '@/lib/types';

export function ResultsView({ input, chart }: { input: BirthInput; chart: NatalChart }) {
  const [tab, setTab] = useState<'planetas' | 'casas'>('planetas');

  const bigThree = [
    { label: 'Sol', sign: chart.sun?.signEs ?? '—', degree: chart.sun?.degree ?? 0 },
    { label: 'Luna', sign: chart.moon?.signEs ?? '—', degree: chart.moon?.degree ?? 0 },
    { label: 'Ascendente', sign: chart.ascendant.signEs, degree: chart.ascendant.degree },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {input.name} · {formatDate(input.date)}, {input.time} · {input.place.label}
      </h1>
      <p className="hint mt-1 mb-4">
        Sol en {chart.sun?.signEs}, Luna en {chart.moon?.signEs}, ascendente {chart.ascendant.signEs}. El prompt de abajo
        se genera con estos datos y puedes leerlo antes de generar.
      </p>

      <div className="grid gap-3 lg:grid-cols-[5fr_7fr] lg:items-start">
        <div className="grid gap-3 lg:sticky lg:top-3">
          <section className="panel" aria-labelledby="titulo-carta">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="titulo-carta" className="text-base font-semibold">Carta natal</h2>
              <span className="hint">Placidus · {formatDate(input.date)} {input.time} UTC</span>
            </div>
            <NatalWheel chart={chart} size={480} />
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {bigThree.map((b) => (
                <div key={b.label}>
                  <span className="block text-[13px] text-muted">{b.label}</span>
                  <div className="text-2xl font-semibold">
                    {b.sign} {Math.floor(b.degree)}°
                  </div>
                </div>
              ))}
            </div>
            {chart.warnings.map((w) => (
              <p key={w} className="hint mt-2">
                {w}
              </p>
            ))}
          </section>

          <section className="panel" aria-labelledby="titulo-posiciones">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-posiciones" className="text-base font-semibold">Posiciones</h2>
              <div role="tablist" aria-label="Tabla de posiciones" className="flex gap-1">
                <button
                  type="button"
                  role="tab"
                  id="tab-planetas"
                  aria-selected={tab === 'planetas'}
                  aria-controls="panel-planetas"
                  onClick={() => setTab('planetas')}
                  className="btn btn-secondary"
                >
                  Planetas
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-casas"
                  aria-selected={tab === 'casas'}
                  aria-controls="panel-casas"
                  onClick={() => setTab('casas')}
                  className="btn btn-secondary"
                >
                  Casas
                </button>
              </div>
            </div>
            <div role="tabpanel" id="panel-planetas" aria-labelledby="tab-planetas" hidden={tab !== 'planetas'} className="overflow-x-auto">
              <PlanetsTable chart={chart} />
            </div>
            <div role="tabpanel" id="panel-casas" aria-labelledby="tab-casas" hidden={tab !== 'casas'} className="overflow-x-auto">
              <HousesTable chart={chart} />
            </div>
          </section>
        </div>

        <div className="grid gap-3">
          <ReportPanel input={input} chart={chart} />
        </div>
      </div>
    </div>
  );
}
