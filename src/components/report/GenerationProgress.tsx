import { REPORT_SECTIONS, sectionStates } from './progress';
import styles from './ReportPanel.module.css';

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
        <span className={styles.elapsed}>{seconds} s</span>
      </div>
    );
  }
  const states = sectionStates(text, false);
  return (
    <ol className={styles.steps} aria-label="Secciones del informe">
      {REPORT_SECTIONS.map((title, i) => (
        <li key={title} className={styles.step} data-state={states[i]}>
          <span className={styles.stepMark} aria-hidden="true" />
          <span>{title}</span>
          {states[i] === 'active' ? <span className={styles.elapsed}>{seconds} s</span> : null}
        </li>
      ))}
    </ol>
  );
}
