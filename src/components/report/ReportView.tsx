'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { nextShown, revealStart } from './progress';
import styles from './ReportPanel.module.css';

/** Reveals `text` at a steady pace instead of in network bursts; instant with reduced motion. */
function useReveal(text: string): number {
  const [shown, setShown] = useState(text.length);
  const shownRef = useRef(text.length);

  useEffect(() => {
    const start = revealStart(shownRef.current, text.length, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (start !== shownRef.current) {
      shownRef.current = start;
      setShown(start);
    }
    if (start >= text.length) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      shownRef.current = nextShown(shownRef.current, text.length, now - last);
      last = now;
      setShown(shownRef.current);
      if (shownRef.current < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return Math.min(shown, text.length);
}

/** The model's markdown, rendered without raw HTML. */
export function ReportView({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const shown = useReveal(text);
  const typing = streaming || shown < text.length;
  return (
    <div className={`prose-report ${styles.reveal}`} data-typing={typing || undefined}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text.slice(0, shown)}</ReactMarkdown>
    </div>
  );
}
