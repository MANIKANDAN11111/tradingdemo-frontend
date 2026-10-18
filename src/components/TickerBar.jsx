import { tickerData } from '../data/tradingData';

function fmtLtp(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Live index strip. Falls back to the bundled demo values when the backend
 * has not answered yet, so the layout never collapses.
 */
export default function TickerBar({ indices, live }) {
  const hasLive = Array.isArray(indices) && indices.some((i) => i.ltp != null);

  if (!hasLive) {
    return (
      <div className="ticker-bar animate-in">
        {tickerData.map((t) => (
          <div className="ticker-item" key={t.symbol}>
            <span>{t.symbol}</span>
            <span className="ticker-value">{t.value}</span>
            <span className={`ticker-change ${t.direction}`}>{t.change}</span>
          </div>
        ))}
        <span className="ticker-source">demo</span>
      </div>
    );
  }

  return (
    <div className="ticker-bar animate-in">
      {indices.map((i) => (
        <div className="ticker-item" key={i.key}>
          <span>{i.label}</span>
          <span className="ticker-value">{fmtLtp(i.ltp)}</span>
          {i.changePct != null && (
            <span className={`ticker-change ${i.direction}`}>
              {i.changePct >= 0 ? '+' : ''}{i.changePct.toFixed(2)}%
            </span>
          )}
        </div>
      ))}
      <span className="ticker-source live">● live</span>
    </div>
  );
}
