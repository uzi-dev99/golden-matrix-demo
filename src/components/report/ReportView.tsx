'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

/**
 * The model's markdown, rendered without raw HTML. While it is written the text sits in a fixed
 * window that follows the newest line, and older lines fade out at the top; when it ends the whole
 * report is shown. Scrolling up inside the window pauses the follow until the reader comes back down.
 */
export function ReportView({
  text,
  streaming = false,
  onTypingChange,
}: {
  text: string;
  streaming?: boolean;
  /** Tells the panel when the text is still being revealed, so its status does not say "complete" too early. */
  onTypingChange?: (typing: boolean) => void;
}) {
  const shown = useReveal(text);
  const typing = streaming || shown < text.length;
  useEffect(() => onTypingChange?.(typing), [typing, onTypingChange]);
  const box = useRef<HTMLDivElement>(null);
  const follow = useRef(true);

  useLayoutEffect(() => {
    if (!text) follow.current = true; // a new run starts following again
    const el = box.current;
    if (typing && follow.current && el) el.scrollTop = el.scrollHeight;
  }, [shown, typing, text]);

  const onScroll = () => {
    const el = box.current;
    if (el && typing) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  return (
    <div ref={box} className={styles.crawl} data-typing={typing || undefined} onScroll={onScroll}>
      <div className={`prose-report ${styles.reveal}`} data-typing={typing || undefined}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text.slice(0, shown)}</ReactMarkdown>
      </div>
    </div>
  );
}
