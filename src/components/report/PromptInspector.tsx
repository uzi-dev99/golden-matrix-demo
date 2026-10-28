'use client';

import { useState } from 'react';
import type { PromptPreview, PromptSegment } from '@/lib/types';
import styles from './ReportPanel.module.css';

function Segments({ segments }: { segments: PromptSegment[] }) {
  return (
    <>
      {segments.map((s, i) =>
        s.token ? (
          <mark key={i} className="injected" title={`{{${s.token}}}`}>
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/** The exact prompt the model will receive, with the injected values highlighted. */
export function PromptInspector({ preview }: { preview: PromptPreview | null }) {
  const [tab, setTab] = useState<'system' | 'user'>('user');
  const segments = preview ? (tab === 'system' ? preview.system : preview.user) : [];
  const injected = preview ? [...preview.system, ...preview.user].filter((s) => s.token).length : 0;

  return (
    <>
      <div className={styles.panelHead}>
        <h2 id="prompt-title" className={styles.panelH}>
          Prompt que recibirá el modelo
        </h2>
        <span className={styles.muted}>
          {preview
            ? `Versión ${preview.version} · ≈${preview.estimatedTokens} tokens de entrada · ${injected} valores inyectados`
            : 'Cargando prompt…'}
        </span>
      </div>
      <div className={styles.seg} role="tablist" aria-label="Mensaje">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'system'}
          className={styles.segButton}
          onClick={() => setTab('system')}
        >
          Sistema
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'user'}
          className={styles.segButton}
          onClick={() => setTab('user')}
        >
          Usuario
        </button>
      </div>
      <div className={styles.legend}>
        <mark className="injected">valor inyectado</mark>
        <span className="hint" style={{ margin: 0 }}>
          Lo resaltado sale del formulario o de la carta; el resto es la plantilla.
        </span>
      </div>
      <div
        className={styles.promptView}
        role="region"
        tabIndex={0}
        aria-label="Texto del prompt"
      >
        {preview ? <Segments segments={segments} /> : 'El prompt aparece aquí en cuanto la carta está calculada.'}
      </div>
    </>
  );
}
