import { useState, useEffect } from 'react';
import { api } from '../api/client';

function pnl(n, digits = 2) {
  if (n == null) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export default function CoinSwitchDashboard({ data }) {
  const [tickers, setTickers] = useState(null);
  const [depth, setDepth] = useState(null);
  const [trades, setTrades] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const [t, d, tr] = await Promise.allSettled([
        api.coinTickers(),
        api.coinDepth('BTC/INR', 'coinswitchx'),
        api.coinTrades('BTC/INR', 'coinswitchx'),
      ]);
      if (t.status === 'fulfilled') setTickers(t.value);
      if (d.status === 'fulfilled') setDepth(d.value);
      if (tr.status === 'fulfilled') setTrades(tr.value);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="broker-placeholder">
        <div className="broker-placeholder-icon">🪙</div>
        <div className="broker-placeholder-title">CoinSwitch</div>
        <div className="broker-placeholder-text">{error}</div>
      </div>
    );
  }

  if (!tickers) {
    return (
      <div className="broker-placeholder">
        <div className="broker-placeholder-icon">🪙</div>
        <div className="broker-placeholder-title">CoinSwitch</div>
        <div className="broker-placeholder-text">Loading market data...</div>
      </div>
    );
  }

  const pairs = tickers?.pairs || (Array.isArray(tickers) ? tickers : Object.values(tickers?.data || {}));

  // Backend field names: lastPrice / changePct / quoteVolume / high / low / bid / ask
  const row = (t) => ({
    symbol: t.symbol || t.pair || `${t.base}${t.quote}`,
    lastPrice: Number(t.lastPrice ?? t.price ?? t.last ?? 0),
    changePct: Number(t.changePct ?? t.changePercent ?? t.change ?? 0),
    quoteVolume: Number(t.quoteVolume ?? t.volume ?? t.volume24h ?? 0),
    high: Number(t.high ?? 0),
    low: Number(t.low ?? 0),
    bid: Number(t.bid ?? 0),
    ask: Number(t.ask ?? 0),
  });
  const rows = (Array.isArray(pairs) ? pairs : []).map(row);
  const depthRows = (depth?.bids?.length || depth?.asks?.length)
    ? Array.from({ length: Math.min(depth?.bids?.length || 0, depth?.asks?.length || 0, 10) })
        .map((_, i) => ({
          bidQty: depth.bids[i]?.quantity ?? '—',
          bidPrice: depth.bids[i]?.price ?? '—',
          askQty: depth.asks[i]?.quantity ?? '—',
          askPrice: depth.asks[i]?.price ?? '—',
        }))
    : [];
  const tradeRows = (trades?.trades || []).slice(0, 12).map((t) => ({
    price: Number(t.price ?? 0),
    qty: Number(t.quantity ?? 0),
    time: t.time ? new Date(t.time).toLocaleTimeString('en-IN', { hour12: false }) : '—',
    buy: t.isBuyerMaker,
  }));

  return (
    <div className="broker-dashboard">
      <div className="broker-dashboard-header">
        <div>
          <h2 className="broker-dashboard-title">CoinSwitch X</h2>
          <p className="broker-dashboard-subtitle">Crypto exchange · Live market feed</p>
        </div>
      </div>

      <div className="panel live-panel">
        <div className="section-header">
          <div className="section-title">
            <span className="icon" style={{ background: 'var(--accent-amber-light)' }}>🪙</span>
            Market Overview
          </div>
          <span className="section-badge">{rows.length} pairs</span>
        </div>

        <div className="table-scroll">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Pair</th>
                <th className="num">Last Price</th>
                <th className="num">24h Change</th>
                <th className="num">24h Volume</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 30).map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                  <td className="num">₹{Number(t.lastPrice).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td className={`num ${t.changePct >= 0 ? 'up' : 'down'}`}>
                    {t.changePct >= 0 ? '+' : ''}{Number(t.changePct).toFixed(2)}%
                  </td>
                  <td className="num">₹{Number(t.quoteVolume).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {depth && (
        <div className="panel live-panel">
          <div className="section-header">
            <div className="section-title">
              <span className="icon" style={{ background: 'var(--accent-cyan-light)' }}>📊</span>
              Market Depth — BTC
            </div>
          </div>
          <div className="table-scroll">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Bids</th>
                  <th className="num">Price</th>
                  <th className="num">Asks</th>
                </tr>
              </thead>
              <tbody>
                {depthRows.map((d, i) => (
                  <tr key={i}>
                    <td className="num up">{d.bidQty}</td>
                    <td className="num">{d.bidPrice}</td>
                    <td className="num down">{d.askQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
