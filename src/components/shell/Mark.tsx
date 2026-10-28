/** The product mark: a drawn ring with four ticks and a brass inner ring (no brand asset). */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="14" cy="14" r="5.5" fill="none" stroke="var(--color-brass)" strokeWidth="2.5" />
      <path d="M14 2v5M14 21v5M2 14h5M21 14h5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
