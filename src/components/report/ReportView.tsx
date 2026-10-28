'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ReportPanel.module.css';

/** The model's markdown, rendered without raw HTML. */
export function ReportView({ text, streaming = false }: { text: string; streaming?: boolean }) {
  return (
    <div className="prose-report">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      {streaming ? <span className={styles.caret} aria-hidden="true" /> : null}
    </div>
  );
}
