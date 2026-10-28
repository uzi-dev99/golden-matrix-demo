import { REPORT_SECTIONS, sectionStates } from './progress';
import styles from './ReportPanel.module.css';

const STATE_LABEL = { done: 'completada', active: 'en curso', pending: 'pendiente' } as const;

/** While a report is generated: a waiting line with elapsed time, then the section checklist. */
export function GenerationProgress({
  waiting,
  text,
  elapsedMs,
  model,
}: {
  waiting: boolean;
  text: string;
  elapsedMs: number;
  model: string;
}) {
  const seconds = (elapsedMs / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (waiting) {
    return (
      <div className={styles.waiting} role="status">
        <span className={styles.orbit} aria-hidden="true" />
        <span className={styles.shimmer}>Enviando el prompt a {model}…</span>
        <span className={styles.elapsed} aria-hidden="true">{seconds} s</span>
      </div>
    );
  }
  const states = sectionStates(text, false);
  return (
    <ol className={styles.steps} role="list" aria-label="Secciones del informe">
      {REPORT_SECTIONS.map((title, i) => (
        <li
          key={title}
          className={styles.step}
          data-state={states[i]}
          aria-current={states[i] === 'active' ? 'step' : undefined}
        >
          <span className={styles.stepMark} aria-hidden="true" />
          <span>{title}</span>
          <span className="sr-only">{STATE_LABEL[states[i]]}</span>
          {states[i] === 'active' ? <span className={styles.elapsed}>{seconds} s</span> : null}
        </li>
      ))}
    </ol>
  );
}
