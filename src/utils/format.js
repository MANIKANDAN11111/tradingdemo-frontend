/** Shared display helpers. */

export function directionOf(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return 'flat';
  return v > 0 ? 'up' : 'down';
}

export function formatPct(n, digits = 2) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

/** 'BTC/INR' -> 'INR' (the quote currency). */
export function coinToQuote(symbol) {
  if (!symbol) return '';
  const parts = String(symbol).split('/');
  return parts.length > 1 ? parts[1] : '';
}

/** 'BTC/INR' -> 'BTC' */
export function coinToBase(symbol) {
  if (!symbol) return '';
  return String(symbol).split('/')[0];
}
