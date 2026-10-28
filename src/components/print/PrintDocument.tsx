'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { HousesTable, PlanetsTable } from '@/components/astrology/PositionsTables';
import { NatalWheel } from '@/components/astrology/NatalWheel';
import { formatDate, formatDegree, signAndDegree } from '@/lib/format';
import type { StoredSession } from '@/lib/types';
import { buildPages } from './pages';

export function PrintDocument({ session }: { session: StoredSession }) {
  const { chart, input, meta } = session;
  const pages = buildPages(session);
  if (!chart || !input) return null;
  const big3 = [
    { label: 'Sol', body: chart.sun },
    { label: 'Luna', body: chart.moon },
    { label: 'Ascendente', body: chart.ascendant },
  ].map((b) => {
    if (!b.body) return { label: b.label, text: '—' };
    const pos = signAndDegree(b.body.signEs, b.body.degree);
    return { label: b.label, text: `${pos.sign} ${Math.floor(pos.degree)}°` };
  });
  const asc = signAndDegree(chart.ascendant.signEs, chart.ascendant.degree);
  const mc = signAndDegree(chart.midheaven.signEs, chart.midheaven.degree);
  const footer = (n: number) => (
    <footer className="sheet-foot">
      <span>
        Astrolabio · carta calculada con astronomy-engine
        {meta ? ` · informe: ${meta.servedModel ?? meta.model} · prompt ${meta.promptVersion}` : ''}
      </span>
      <span>{n}</span>
    </footer>
  );
  return (
    <div className="sheets">
      {pages.map((p, i) => (
        <section className="sheet" key={i}>
          {p.kind === 'cover' && (
            <>
              <p className="muted">Astrolabio · Carta natal</p>
              <h1>{input.name}</h1>
              <p className="sub">{formatDate(input.date)}, {input.time} · {input.place.label} ({input.place.timezone})</p>
              <NatalWheel chart={chart} size={560} />
              <div className="big3">
                {big3.map((b) => (
                  <div key={b.label}><span>{b.label}</span><div className="figure">{b.text}</div></div>
                ))}
              </div>
              {chart.warnings.map((w) => <p key={w} className="hint">{w}</p>)}
            </>
          )}
          {p.kind === 'positions' && (
            <>
              <h2>Posiciones</h2>
              <div className="cols"><PlanetsTable chart={chart} /><HousesTable chart={chart} /></div>
              <p className="hint">Ascendente {formatDegree(asc.degree)} {asc.sign} · Medio cielo {formatDegree(mc.degree)} {mc.sign}</p>
            </>
          )}
          {p.kind === 'section' && (
            <>
              <h2>{p.title}</h2>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.body}</ReactMarkdown>
            </>
          )}
          {footer(i + 1)}
        </section>
      ))}
    </div>
  );
}
