'use client';

import type { ModelInfo } from '@/lib/types';
import styles from './ReportPanel.module.css';

/** Model picker: the names come from /api/models (the server allow-list), never from the client. */
export function ModelSelector({
  models,
  value,
  onChange,
}: {
  models: ModelInfo[];
  value: string;
  onChange: (id: string) => void;
}) {
  const current = models.find((m) => m.id === value);
  return (
    <div className="field" style={{ margin: 0 }}>
      <label htmlFor="model">Modelo</label>
      <select id="model" className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.free ? ' · gratis' : ''}
          </option>
        ))}
      </select>
      {current?.free ? <span className={`${styles.pill} ${styles.pillFree}`}>gratis</span> : null}
    </div>
  );
}
