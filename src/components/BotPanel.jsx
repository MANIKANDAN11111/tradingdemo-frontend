import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import StrategyConfluence from './StrategyConfluence';
function pnl(n, digits = 2) {
  if (n == null) return '—';
  const v = Number(n);
  return `${v >= 0 ? '+' : ''}₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function AccuracyCard({ title, data }) {
  if (!data || !data.total) {
    return (
      <div className="acc-card">
        <div className="acc-label">{title}</div>
        <div className="acc-empty">—</div>
        <div className="acc-sub">no {title.toLowerCase().includes('paper') ? 'paper' : 'live'} trades yet</div>
      </div>
    );
  }
  const rows = ['expiry days', 'non-expiry days', 'fridays'];
  return (
    <div className="acc-card">
      <div className="acc-label">{title}</div>
      <div className="acc-main">{data.accuracy}<span className="acc-pct">%</span></div>
      <div className="acc-sub">
        {data.won} of {data.total} trades won · avg win {pnl(data.avgWin, 0)} · avg loss {pnl(data.avgLoss, 0)}
      </div>
      <div className="table-scroll">
        <table className="acc-table">
          <thead>
            <tr><th></th><th>Trades</th><th>Win&nbsp;%</th><th className="num">P&amp;L</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const b = data.buckets?.[r];
              if (!b) return <tr key={r}><td className="muted">{r}</td><td className="muted">0</td><td className="muted">—</td><td className="num muted">—</td></tr>;
              return (
                <tr key={r}>
                  <td>{r}</td>
                  <td>{b.trades}</td>
                  <td>{b.winPct != null ? `${b.winPct}%` : '—'}</td>
                  <td className={`num ${b.pnl > 0 ? 'pos' : b.pnl < 0 ? 'neg' : ''}`}>{pnl(b.pnl, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BotPanel() {
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([api.botStatus(), api.botAnalytics()]);
      setStatus(s.status);
      setAnalytics(a.strategies);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const s = status;
  const strategies = s?.strategies || [];
  const analyticsMap = {};
  if (analytics) for (const [id, v] of Object.entries(analytics)) analyticsMap[id] = v;

  const liveOk = s?.live?.enabled;

  return (
    <div className="bot-panel">
      <div className="panel live-panel">
        <div className="live-panel-head">
          <div>
            <span className="panel-title"><span className="icon" style={{ background: 'var(--accent-blue-light)' }}>🤖</span> Strategy Bot</span>
            <span className={`section-badge ${s?.running ? 'live-badge' : ''}`}>{s?.running ? '● running' : '○ stopped'}</span>
          </div>
        </div>

        {/* Execution mode — matches the reference "Switch to live" box */}
        <div className="exec-box">
          <div className="exec-info">
            <div className="exec-label">Execution mode</div>
            <div className={`exec-mode ${s?.mode === 'live' ? 'live' : ''}`}>
              {s?.mode === 'live' ? 'LIVE — real money' : 'PAPER — simulated'}
            </div>
            <div className="exec-desc">
              {s?.mode === 'live'
                ? 'Orders are sent to your broker and execute with real money.'
                : 'Nothing is sent to the broker. Signals, stops and limits all still run.'}
            </div>
            {s?.haltedReason && <div className="exec-halt">Halted: {s?.haltedReason}</div>}
          </div>
          {s?.mode === 'paper' ? (
            <button className="btn btn-exec" disabled={busy || !liveOk}
              title={liveOk ? 'Switch to live trading' : `Live unavailable: ${(s?.live?.reasons || []).join('; ')}`}
              onClick={() => act(() => api.botSetMode('live'))}>
              Switch to live
            </button>
          ) : (
            <button className="btn btn-exec" disabled={busy}
              onClick={() => act(() => api.botSetMode('paper'))}>
              Switch to paper
            </button>
          )}
        </div>
        {s?.mode === 'live' && !liveOk && (
          <div className="live-note">Live trading is disabled — set <code>LIVE_TRADING_ENABLED=true</code> in server/.env, then restart.</div>
        )}
        {s?.mode === 'paper' && (
          <div className="live-note">Paper trading — simulated fills at the option's live price.</div>
        )}

        {/* Controls */}
        <div className="bot-controls">
          {s?.running ? (
            <>
              <button className="btn btn-ghost" disabled={busy} onClick={() => act(() => api.botStop())}>Stop</button>
              <button className="btn btn-danger" disabled={busy} onClick={() => act(() => api.botHalt('manual halt'))}>Kill switch</button>
            </>
          ) : (
            <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api.botStart())}>Start bot</button>
          )}
          <button className="btn btn-ghost" disabled={busy} onClick={() => act(() => refresh())}>↻ Refresh</button>
        </div>

        {/* Account + risk readout */}
        {s && (
          <div className="bot-stats">
            <div className="bot-stat"><span>Capital</span><b>{pnl(s.capital, 0)}</b></div>
            <div className="bot-stat"><span>Daily loss limit</span><b>{pnl(s.settings?.maxLossPerDay ?? 0, 0)}</b></div>
            <div className="bot-stat"><span>Per-trade limit</span><b>{pnl(s.settings?.maxLossPerTrade ?? 0, 0)}</b></div>
            <div className="bot-stat"><span>Sector exposure cap</span><b>{s.settings?.maxSectorExposurePct ?? 0}%</b></div>
          </div>
        )}

        {error && <div className="live-empty">{error}</div>}

        {/* Strategy cards */}
        {strategies.map((st) => {
          const a = analyticsMap[st.id] || {};
          return (
            <div className="bot-strategy" key={st.id}>
              <div className="bot-strategy-head">
                <div>
                  <div className="bot-strategy-name">
                    {st.name}
                    <span className={`mode-tag ${s?.mode}`}>{s?.mode === 'live' ? 'Live' : 'Paper - simulated'}</span>
                  </div>
                  <div className="bot-strategy-sub">
                    {st.instrument.underlying} · {st.entry.side} · qty {st.entry.quantity}
                    {st.symbol && <> · <code>{st.symbol}</code></>}
                  </div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={st.enabled} disabled={busy}
                    onChange={(e) => act(() => api.botToggleStrategy(st.id, e.target.checked))} />
                  <span className="slider" />
                </label>
              </div>

              <div className="acc-grid">
                <AccuracyCard title="Paper trading accuracy" data={a.paper} />
                <AccuracyCard title="Live trading accuracy" data={a.live} />
              </div>

              {/* Multi-timeframe strategies carry a live confluence readout. */}
              {st.type === 'esakky' && <StrategyConfluence eval={st.lastEval} />}
            </div>
          );
        })}

        {strategies.length === 0 && (
          <div className="live-empty">No strategies defined. Add them in server/config/strategies.json.</div>
        )}
      </div>
    </div>
  );
}
