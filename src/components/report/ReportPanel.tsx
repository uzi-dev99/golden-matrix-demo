'use client';

import { useEffect, useRef, useState } from 'react';
import { streamReport } from '@/lib/report-client';
import { patchSession } from '@/lib/session-store';
import type { BirthInput, ModelInfo, NatalChart, PromptOptions, PromptPreview, ReportMeta } from '@/lib/types';
import { formatCost, formatMs, formatTokens } from './format-meta';
import { GenerationProgress } from './GenerationProgress';
import { ModelSelector } from './ModelSelector';
import { PromptInspector } from './PromptInspector';
import { ReportView } from './ReportView';
import styles from './ReportPanel.module.css';

export interface ReportPanelProps {
  input: BirthInput;
  chart: NatalChart;
}

const TONE_LABEL: Record<PromptOptions['tone'], string> = { neutral: 'Neutro', warm: 'Cálido', clinical: 'Técnico' };
const LENGTH_LABEL: Record<PromptOptions['length'], string> = { short: 'Corta', medium: 'Media', long: 'Larga' };

type Phase = 'idle' | 'requesting' | 'streaming' | 'done' | 'error' | 'stopped';

/** The four metrics of the last run. Before a run every value is a dash. */
export function ReportMetaStrip({ meta, free }: { meta: ReportMeta | null; free: boolean }) {
  const est = meta?.usageEstimated ? '≈' : '';
  return (
    <div className={styles.meta}>
      <div>
        <span>Modelo</span>
        <b>{meta ? (meta.servedModel ?? meta.model) : '—'}</b>
        {meta?.servedModel && meta.servedModel !== meta.model ? <small>pedido: {meta.model}</small> : null}
      </div>
      <div>
        <span>Latencia</span>
        <b>{meta ? formatMs(meta.latencyMs) : '—'}</b>
        {meta?.firstTokenMs !== undefined ? <small>primer token {formatMs(meta.firstTokenMs)}</small> : null}
      </div>
      <div>
        <span>Tokens</span>
        <b>{meta ? `${est}${formatTokens(meta.totalTokens)}` : '—'}</b>
        {meta ? (
          <small>
            {est}
            {formatTokens(meta.promptTokens)} entrada · {est}
            {formatTokens(meta.completionTokens)} salida
          </small>
        ) : null}
      </div>
      <div>
        <span>Coste</span>
        <b>{meta ? formatCost(meta.costUsd, free) : '—'}</b>
        {meta && free ? <small>modelo gratuito</small> : null}
      </div>
      {meta ? (
        <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="btn btn-secondary" href="/print">
            Imprimir o guardar PDF
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function ReportPanel({ input }: ReportPanelProps) {
  const [options, setOptions] = useState<PromptOptions>({ tone: 'neutral', length: 'short' });
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState('');
  const [preview, setPreview] = useState<PromptPreview | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  const streamed = useRef('');
  const reportSection = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/models')
      .then((r) => r.json())
      .then((body: { data?: { models: ModelInfo[]; default: string } }) => {
        if (cancelled || !body.data) return;
        setModels(body.data.models);
        setModel(body.data.default);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // The preview follows the options, debounced; a model change does not change the prompt.
  // The dependency is the serialized input: the parent may pass a new object on every render.
  const inputKey = JSON.stringify(input);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch('/api/prompt/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: JSON.parse(inputKey), options }),
      })
        .then((r) => r.json())
        .then((body: { ok: boolean; data?: PromptPreview }) => {
          if (cancelled || !body.ok || !body.data) return;
          setPreview(body.data);
        })
        .catch(() => undefined);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputKey, options]);

  const busy = phase === 'requesting' || phase === 'streaming';

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed(performance.now() - start), 100);
    return () => clearInterval(timer);
  }, [busy]);

  // Once the waiting state is on screen, bring the report window into view: the reader watches it fill
  // without scrolling. (Calling it in the click handler loses the smooth scroll to the re-render.)
  useEffect(() => {
    if (phase !== 'requesting') return;
    reportSection.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [phase]);

  const generate = async () => {
    setPhase('requesting');
    setError('');
    setText('');
    setMeta(null);
    setElapsed(0);
    streamed.current = '';
    const controller = new AbortController();
    abort.current = controller;
    try {
      await streamReport({ input, options, model }, (ev) => {
        if (ev.type === 'delta') {
          streamed.current += ev.text;
          setText(streamed.current);
          setPhase('streaming');
        } else if (ev.type === 'meta') {
          setMeta(ev.meta);
          setPhase('done');
          patchSession({ report: streamed.current, meta: ev.meta });
        } else {
          setError(ev.message);
          setPhase('error');
        }
      }, controller.signal);
    } catch {
      // "Detener" aborts the request: the phase is already 'stopped'. Anything else is a failure.
      if (!controller.signal.aborted) {
        setError('Se interrumpió la conexión.');
        setPhase('error');
      }
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  const stop = () => {
    abort.current?.abort();
    abort.current = null;
    setPhase('stopped');
    patchSession({ report: streamed.current });
  };

  const free = models.find((m) => m.id === model)?.free ?? false;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <section className="panel" aria-label="Prompt del modelo">
        <PromptInspector preview={preview} />
        <div className={styles.opts}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="tone">Tono</label>
            <select
              id="tone"
              className="input"
              value={options.tone}
              onChange={(e) => setOptions({ ...options, tone: e.target.value as PromptOptions['tone'] })}
            >
              {Object.entries(TONE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="length">Extensión</label>
            <select
              id="length"
              className="input"
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: e.target.value as PromptOptions['length'] })}
            >
              {Object.entries(LENGTH_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <ModelSelector models={models} value={model} onChange={setModel} />
        </div>
        <div className={styles.foot}>
          <span className={styles.muted}>
            Se enviará a <b style={{ color: 'var(--color-ink)' }}>{model || '—'}</b> · máx. 1 800 tokens de salida
          </span>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy || !preview}>
            Generar informe
          </button>
        </div>
      </section>

      <section ref={reportSection} className="panel" aria-label="Informe" aria-live="polite">
        <div className={styles.panelHead}>
          <h2 className={styles.panelH}>Informe</h2>
          <div className={styles.status}>
            <span
              style={{
                display: 'block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: phase === 'done' ? 'var(--color-ok)' : 'var(--color-brass)',
              }}
              aria-hidden="true"
            />
            <span>
              {phase === 'requesting'
                ? 'Esperando al modelo…'
                : phase === 'streaming'
                  ? `Escribiendo · ${words} palabras`
                  : phase === 'done'
                    ? `Informe completo · ${words} palabras`
                    : phase === 'stopped'
                      ? `Detenido · ${words} palabras`
                      : phase === 'error'
                        ? 'Error al generar el informe'
                        : 'Sin informe todavía'}
            </span>
            {phase === 'streaming' ? (
              <button type="button" className="btn btn-secondary" onClick={stop} style={{ padding: '0 12px' }}>
                Detener
              </button>
            ) : null}
          </div>
        </div>
        {busy ? <GenerationProgress waiting={phase === 'requesting'} text={text} elapsedMs={elapsed} model={model} /> : null}
        <ReportView text={text} streaming={phase === 'streaming'} />
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <ReportMetaStrip meta={meta} free={free} />
      </section>
    </>
  );
}
