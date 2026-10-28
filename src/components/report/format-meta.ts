/** Spanish formatting for the meta strip: comma decimals, thin-space thousands. */
export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
}

export function formatTokens(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

export function formatCost(costUsd: number | undefined, free: boolean): string {
  if (free) return '0 US$';
  if (costUsd === undefined) return '—';
  if (costUsd === 0) return '0 US$';
  return `US$ ${costUsd.toFixed(4).replace('.', ',')}`;
}
