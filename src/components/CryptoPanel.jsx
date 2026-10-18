import { useEffect, useMemo, useState } from 'react';
import { coinToQuote, formatPct, directionOf } from '../utils/format';

function fmtPrice(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const v = Number(n);
  if (v >= 1000) return v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString('en-IN', { maximumFractionDigits: 6 });
}

function fmtVolume(n) {
  if (n === null || n === undefined) return '—';
  const v = Number(n);
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

function fmtClock(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('en-IN', { hour12: false });
}

function Change({ value }) {
  const dir = directionOf(value);
  return (
    <span className={`stat-change ${dir}`}>
      {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•'} {formatPct(value)}
    </span>
  );
}

/**
 * CoinSwitch PRO crypto market panel: top pairs by 24h turnover, a selectable
 * coin, its live order book and recent trades.
 */
export default function CryptoPanel({ data, error, loading, lastUpdated, onRefresh }) {
  const [selected, setSelected] = useState('BTC/INR');

  const pairs = data?.topPairs || [];
  const focus = data?.focus || {};

  // Keep the selection valid if the backend list changes.
  useEffect(() => {
    if (pairs.length && !pairs.some((p) => p.symbol === selected)) {
      setSelected(pairs[0].symbol);
    }
  }, [pairs, selected]);

  const active = useMemo(
    () => pairs.find((p) => p.symbol === selected) || null,
    [pairs, selected],
  );

  const maxQty = useMemo(() => {
    const q = (list) => list?.reduce((m, x) => Math.max(m, Number(x.quantity) || 0), 0) || 1;
    return Math.max(q(focus.bids), q(focus.asks));
  }, [focus]);

  return (
    <section className="crypto-panel animate-in">
      <div className="crypto-head">
        <div className="section-title">
          <span className="icon" style={{ background: 'var(--accent-amber-light)' }}>₿</span>
          CoinSwitch Pro · Crypto Markets
        </div>
        <div className="crypto-head-right">
          {data?.valid && <span className="live-dot" title="API key validated" />}
          <span className="section-badge">
            {data?.valid ? 'Key valid' : 'Key not validated'}
          </span>
          {lastUpdated && (
            <span className="conn-meta">
              updated {lastUpdated.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          )}
          <button className="refresh-btn" onClick={onRefresh} disabled={loading} title="Refresh">
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="live-error">
          CoinSwitch unreachable: {error}
          <div className="live-error-hint">
            Start the backend (<code>cd server && npm start</code>) to load live crypto markets.
          </div>
        </div>
      )}

      {/* Selectable pair strip */}
      <div className="crypto-strip">
        {pairs.map((p) => (
          <button
            key={p.symbol}
            className={`crypto-chip ${p.symbol === selected ? 'active' : ''} ${directionOf(p.changePct)}`}
            onClick={() => setSelected(p.symbol)}
          >
            <span className="chip-symbol">{p.symbol.replace('/INR', '')}</span>
            <span className="chip-price">{fmtPrice(p.lastPrice)}</span>
            <span className="chip-change">{formatPct(p.changePct)}</span>
          </button>
        ))}
        {pairs.length === 0 && !error && (
          <span className="live-empty">{loading ? 'Loading markets…' : 'No pairs returned.'}</span>
        )}
      </div>

      {/* Selected pair summary — full width so nothing is left dangling */}
      <div className="crypto-summary">
        {active ? (
          <>
            <div className="crypto-summary-left">
              <div className="crypto-symbol">
                <span className="sym-base">{active.symbol.replace('/INR', '')}</span>
                <span className="sym-quote">/ INR</span>
                <Change value={active.changePct} />
              </div>
              <div className="crypto-price">{fmtPrice(active.lastPrice)}</div>
            </div>

            <div className="crypto-stats">
              <div className="mini-stat">
                <span className="mini-label">24h High</span>
                <span className="mini-value up">{fmtPrice(active.high)}</span>
              </div>
              <div className="mini-stat">
                <span className="mini-label">24h Low</span>
                <span className="mini-value down">{fmtPrice(active.low)}</span>
              </div>
              <div className="mini-stat">
                <span className="mini-label">24h Volume</span>
                <span className="mini-value">{fmtVolume(active.quoteVolume)}</span>
              </div>
              <div className="mini-stat">
                <span className="mini-label">Bid / Ask</span>
                <span className="mini-value">
                  {fmtPrice(active.bid)} <span className="sep">/</span> {fmtPrice(active.ask)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <span className="live-empty">Select a pair to see detail.</span>
        )}
      </div>

      {/* Order book and trades side by side — both columns carry real height */}
      <div className="crypto-grid">
        <div className="crypto-block">
          <div className="live-subhead">Order Book</div>
          <div className="book">
            <div className="book-side asks">
              {(focus.asks || []).map((a, i) => (
                <div className="book-row" key={`a${i}`}>
                  <span className="book-price ask">{fmtPrice(a.price)}</span>
                  <span className="book-qty">{a.quantity}</span>
                  <span className="book-bar" style={{ width: `${(a.quantity / maxQty) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="book-mid">
              <span className="spread">
                {coinToQuote(active?.symbol || focus.symbol || '')}
              </span>
            </div>
            <div className="book-side bids">
              {(focus.bids || []).map((b, i) => (
                <div className="book-row" key={`b${i}`}>
                  <span className="book-price bid">{fmtPrice(b.price)}</span>
                  <span className="book-qty">{b.quantity}</span>
                  <span className="book-bar" style={{ width: `${(b.quantity / maxQty) * 100}%` }} />
                </div>
              ))}
            </div>
          </div>
          {(!focus.asks?.length && !focus.bids?.length) && (
            <span className="live-empty">No book data.</span>
          )}
        </div>

        <div className="crypto-block">
          <div className="live-subhead">Recent Trades</div>
          <div className="trades">
            {(focus.trades || []).map((t, i) => (
              <div className="trade-row" key={`${t.id}-${i}`}>
                <span className="trade-time">{fmtClock(t.time)}</span>
                <span className={`trade-price ${t.isBuyerMaker ? 'bid' : 'ask'}`}>{fmtPrice(t.price)}</span>
                <span className="trade-qty">{t.quantity}</span>
              </div>
            ))}
            {!focus.trades?.length && <span className="live-empty">No trades yet.</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
