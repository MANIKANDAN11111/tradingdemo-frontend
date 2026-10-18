import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';

/* ---------- helpers ---------- */

function pnl(n, digits = 2) {
  if (n == null) return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `${v >= 0 ? '+' : ''}₹${v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function fmtNum(n, digits = 2) {
  if (n == null) return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pnlClass(n) {
  const v = Number(n ?? 0);
  if (v > 0) return 'profit';
  if (v < 0) return 'loss';
  return 'neutral';
}

function statusClass(s) {
  return s === 'COMPLETE' || s === 'filled' || s === 'done' ? 'up'
    : s === 'CANCELLED' || s === 'cancelled' || s === 'rejected' ? 'down'
    : '';
}

function detectBrokerType(broker) {
  const name = (broker?.name || broker?.broker_type || broker?.id || '').toLowerCase();
  if (name.includes('groww')) return 'groww';
  if (name.includes('fyers')) return 'fyers';
  return 'unknown';
}

/* ---------- sub-components ---------- */

function AccCard({ title, data }) {
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

function GrowwSection({ data }) {
  const positions = data?.positions?.fno ?? [];
  const margins = data?.margins;
  const funds = data?.funds;
  const orders = data?.orders ?? [];
  const realised = data?.positions?.realisedPnl ?? 0;

  const isClosed = (p) => Number(p.quantity ?? 0) === 0;
  const openPositions = positions.filter((p) => !isClosed(p));
  const closedPositions = positions.filter(isClosed);

  return (
    <>
      {/* Margins / funds */}
      {(margins || funds) && (
        <div className="funds-grid">
          {funds?.clearCash != null && (
            <div className="fund-card">
              <div className="fund-label">Clear Cash</div>
              <div className="fund-value">{fmtNum(funds.clearCash)}</div>
            </div>
          )}
          {funds?.netMarginUsed != null && (
            <div className="fund-card">
              <div className="fund-label">Net Margin Used</div>
              <div className="fund-value">{fmtNum(funds.netMarginUsed)}</div>
            </div>
          )}
          {margins?.availableMargin != null && (
            <div className="fund-card">
              <div className="fund-label">Available Margin</div>
              <div className="fund-value">{fmtNum(margins.availableMargin)}</div>
            </div>
          )}
          {margins?.collateral != null && (
            <div className="fund-card">
              <div className="fund-label">Collateral</div>
              <div className="fund-value">{fmtNum(margins.collateral)}</div>
            </div>
          )}
          <div className="fund-card">
            <div className="fund-label">Open F&amp;O Positions</div>
            <div className="fund-value">{openPositions.length}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Realised P&amp;L</div>
            <div className={`fund-value ${pnlClass(realised)}`}>{pnl(realised)}</div>
          </div>
        </div>
      )}

      {/* Open positions */}
      <div className="live-subhead">
        Open F&amp;O positions <span className="section-badge">{openPositions.length}</span>
      </div>
      {openPositions.length > 0 ? (
        <div className="trades-table-wrap">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Symbol</th><th>Exchange</th><th>Product</th>
                <th className="num">Qty</th><th className="num">Net Price</th>
                <th className="num">Realised P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((p, i) => (
                <tr key={`open-${p.tradingSymbol}-${i}`}>
                  <td style={{ fontWeight: 600 }}>{p.tradingSymbol}</td>
                  <td>{p.exchange}</td>
                  <td>{p.product}</td>
                  <td className="num">{p.quantity}</td>
                  <td className="num">{fmtNum(p.netPrice)}</td>
                  <td className={`num ${Number(p.realisedPnl) >= 0 ? 'up' : 'down'}`}>{pnl(p.realisedPnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="live-empty">No open F&amp;O positions.</div>
      )}

      {/* Squared-off */}
      {closedPositions.length > 0 && (
        <>
          <div className="live-subhead">
            Squared off today <span className="section-badge">{closedPositions.length}</span>
          </div>
          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Symbol</th><th>Exchange</th><th>Product</th>
                  <th className="num">Bought</th><th className="num">Sold</th>
                  <th className="num">Avg Price</th><th className="num">Realised P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {closedPositions.map((p, i) => (
                  <tr key={`closed-${p.tradingSymbol}-${i}`}>
                    <td style={{ fontWeight: 600 }}>{p.tradingSymbol}</td>
                    <td>{p.exchange}</td>
                    <td>{p.product}</td>
                    <td className="num">{p.debitQuantity ?? '—'}</td>
                    <td className="num">{p.creditQuantity ?? '—'}</td>
                    <td className="num">{fmtNum(p.netPrice)}</td>
                    <td className={`num ${Number(p.realisedPnl) >= 0 ? 'up' : 'down'}`}>{pnl(p.realisedPnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Recent orders */}
      {orders.length > 0 && (
        <>
          <div className="live-subhead">
            Recent orders <span className="section-badge">{orders.length}</span>
          </div>
          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Time</th><th>Symbol</th><th>Side</th><th>Segment</th>
                  <th className="num">Qty</th><th className="num">Price</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o, i) => (
                  <tr key={`order-${o.orderId}-${i}`}>
                    <td className="muted">{o.orderTimestamp || o.createdAt || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{o.tradingSymbol || o.symbol}</td>
                    <td>{o.transactionType || o.side}</td>
                    <td>{o.segment || o.product}</td>
                    <td className="num">{o.quantity ?? o.filledQuantity ?? '—'}</td>
                    <td className="num">{fmtNum(o.price ?? o.averagePrice)}</td>
                    <td className={statusClass(o.orderStatus || o.status)}>{o.orderStatus || o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function FyersSection({ data }) {
  const positions = data?.positions ?? [];
  const funds = data?.funds;
  const orders = data?.orders ?? [];

  return (
    <>
      {/* Funds */}
      {funds && (
        <div className="funds-grid">
          {funds.availableBalance != null && (
            <div className="fund-card">
              <div className="fund-label">Available Balance</div>
              <div className="fund-value">{fmtNum(funds.availableBalance)}</div>
            </div>
          )}
          {funds.usedMargin != null && (
            <div className="fund-card">
              <div className="fund-label">Used Margin</div>
              <div className="fund-value">{fmtNum(funds.usedMargin)}</div>
            </div>
          )}
          {funds.realisedPnl != null && (
            <div className="fund-card">
              <div className="fund-label">Realised P&amp;L</div>
              <div className={`fund-value ${pnlClass(funds.realisedPnl)}`}>{pnl(funds.realisedPnl)}</div>
            </div>
          )}
          {funds.unrealisedPnl != null && (
            <div className="fund-card">
              <div className="fund-label">Unrealised P&amp;L</div>
              <div className={`fund-value ${pnlClass(funds.unrealisedPnl)}`}>{pnl(funds.unrealisedPnl)}</div>
            </div>
          )}
          <div className="fund-card">
            <div className="fund-label">Open Positions</div>
            <div className="fund-value">{positions.length}</div>
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="live-subhead">
        Positions <span className="section-badge">{positions.length}</span>
      </div>
      {positions.length > 0 ? (
        <div className="trades-table-wrap">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Symbol</th><th>Exchange</th><th>Side</th><th>Product</th>
                <th className="num">Qty</th><th className="num">Avg Price</th>
                <th className="num">LTP</th><th className="num">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <tr key={`pos-${p.symbol}-${i}`}>
                  <td style={{ fontWeight: 600 }}>{p.symbol}</td>
                  <td>{p.exchange}</td>
                  <td>{p.side === 1 ? 'BUY' : p.side === -1 ? 'SELL' : p.side}</td>
                  <td>{p.productType || p.segment}</td>
                  <td className="num">{p.quantity ?? p.qty ?? '—'}</td>
                  <td className="num">{fmtNum(p.avgPrice ?? p.buyPrice ?? p.sellPrice)}</td>
                  <td className="num">{fmtNum(p.ltp ?? p.lastPrice)}</td>
                  <td className={`num ${Number(p.pl ?? p.pnl) >= 0 ? 'up' : 'down'}`}>{pnl(p.pl ?? p.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="live-empty">No open positions.</div>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <>
          <div className="live-subhead">
            Recent orders <span className="section-badge">{orders.length}</span>
          </div>
          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Time</th><th>Symbol</th><th>Side</th><th>Type</th>
                  <th className="num">Qty</th><th className="num">Price</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((o, i) => (
                  <tr key={`order-${o.id}-${i}`}>
                    <td className="muted">{o.orderDateTime || o.time || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{o.symbol}</td>
                    <td>{o.side === 1 ? 'BUY' : o.side === -1 ? 'SELL' : o.side}</td>
                    <td>{o.type || o.orderType}</td>
                    <td className="num">{o.qty ?? o.filledQty ?? '—'}</td>
                    <td className="num">{fmtNum(o.price ?? o.filledPrice)}</td>
                    <td className={statusClass(o.status)}>{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function UnknownSection({ brokerName }) {
  return (
    <div className="live-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔌</div>
      <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
        API integration coming soon
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
        {brokerName ? `Live data for ${brokerName} is not yet supported. ` : ''}
        Connect Groww or Fyers to see your account overview.
      </div>
    </div>
  );
}

/* ---------- main component ---------- */

export default function BrokerDashboard({ broker, data }) {
  const brokerType = detectBrokerType(broker);
  const brokerName = broker?.name || broker?.broker_type || 'Unknown';

  // Bot state
  const [botStatus, setBotStatus] = useState(null);
  const [botAnalytics, setBotAnalytics] = useState(null);
  const [botError, setBotError] = useState(null);
  const [botBusy, setBotBusy] = useState(false);

  const refreshBot = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([api.botStatus(), api.botAnalytics()]);
      setBotStatus(s.status);
      setBotAnalytics(a.strategies);
      setBotError(null);
    } catch (e) {
      setBotError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshBot();
    const t = setInterval(refreshBot, 8000);
    return () => clearInterval(t);
  }, [refreshBot]);

  const act = async (fn) => {
    setBotBusy(true);
    try {
      await fn();
      await refreshBot();
    } catch (e) {
      setBotError(e.message);
    } finally {
      setBotBusy(false);
    }
  };

  // Account overview stats
  const stats = data?.stats || {};
  const totalPnl = stats.totalPnl ?? data?.pnl ?? data?.positions?.realisedPnl ?? 0;
  const balance = stats.balance ?? data?.funds?.clearCash ?? data?.funds?.availableBalance ?? data?.balance ?? 0;
  const openPosCount = data?.positions?.fno?.filter((p) => Number(p.quantity) !== 0).length
    ?? data?.positions?.length ?? 0;

  // Accuracy data
  const accuracyData = data?.accuracy || botAnalytics || {};
  const paperAcc = accuracyData.paper;
  const liveAcc = accuracyData.live;

  // Bot helpers
  const s = botStatus;
  const strategies = s?.strategies || [];
  const analyticsMap = {};
  if (botAnalytics) for (const [id, v] of Object.entries(botAnalytics)) analyticsMap[id] = v;
  const liveOk = s?.live?.enabled;

  return (
    <div className="bot-panel animate-in">
      {/* ===== Account Overview ===== */}
      <div className="panel live-panel">
        <div className="section-header">
          <div className="section-title">
            <span className="icon" style={{ background: 'var(--accent-blue-light)' }}>📊</span>
            {brokerName} Dashboard
          </div>
          <div className="live-panel-meta">
            <span className={`conn-status ${data?.auth?.valid ? 'ok' : data?.partial ? 'warn' : 'bad'}`}>
              ● {data?.auth?.valid ? 'Connected' : data?.partial ? 'Partial' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stats-row" style={{ marginBottom: '20px' }}>
          <div className="stat-card">
            <div className="stat-label">Balance</div>
            <div className={`stat-value ${pnlClass(balance)}`}>₹{fmtNum(balance, 0)}</div>
            <div className="stat-sub">available</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Open Positions</div>
            <div className="stat-value">{openPosCount}</div>
            <div className="stat-sub">current</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total P&amp;L</div>
            <div className={`stat-value ${pnlClass(totalPnl)}`}>{pnl(totalPnl, 0)}</div>
            <div className="stat-sub">realised</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Broker</div>
            <div className="stat-value" style={{ fontSize: '22px', paddingTop: '4px' }}>{brokerName}</div>
            <div className="stat-sub">{brokerType === 'groww' ? 'Groww API' : brokerType === 'fyers' ? 'Fyers API' : '—'}</div>
          </div>
        </div>

        {data?.errors?.length > 0 && (
          <div className="live-error">
            <strong>Partial data:</strong>
            <ul style={{ margin: '6px 0 0 18px' }}>
              {data.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* ===== Broker-specific data ===== */}
      <div className="panel live-panel">
        <div className="section-header">
          <div className="section-title">
            <span className="icon" style={{ background: 'var(--accent-cyan-light)' }}>🔌</span>
            {brokerName} Account
          </div>
          <span className="section-badge">
            {brokerType === 'groww' ? 'Groww' : brokerType === 'fyers' ? 'Fyers' : 'Unknown'} data
          </span>
        </div>

        {brokerType === 'groww' && <GrowwSection data={data} />}
        {brokerType === 'fyers' && <FyersSection data={data} />}
        {brokerType === 'unknown' && <UnknownSection brokerName={brokerName} />}
      </div>

      {/* ===== Accuracy section ===== */}
      <div className="panel live-panel">
        <div className="section-header">
          <div className="section-title">
            <span className="icon" style={{ background: 'var(--accent-amber-light)' }}>🎯</span>
            Strategy Accuracy
          </div>
        </div>
        <div className="acc-grid">
          <AccCard title="Paper trading accuracy" data={paperAcc} />
          <AccCard title="Live trading accuracy" data={liveAcc} />
        </div>
      </div>

      {/* ===== Bot controls ===== */}
      <div className="panel live-panel">
        <div className="live-panel-head">
          <div>
            <span className="panel-title">
              <span className="icon" style={{ background: 'var(--accent-blue-light)' }}>🤖</span>
              Strategy Bot
            </span>
            <span className={`section-badge ${s?.running ? 'live-badge' : ''}`}>
              {s?.running ? '● running' : '○ stopped'}
            </span>
          </div>
        </div>

        {/* Execution mode */}
        <div className={`exec-box ${s?.mode === 'live' ? 'live-mode' : ''}`}>
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
            <button className="btn btn-exec" disabled={botBusy || !liveOk}
              title={liveOk ? 'Switch to live trading' : `Live unavailable: ${(s?.live?.reasons || []).join('; ')}`}
              onClick={() => act(() => api.botSetMode('live'))}>
              Switch to live
            </button>
          ) : (
            <button className="btn btn-exec" disabled={botBusy}
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
              <button className="btn btn-ghost" disabled={botBusy} onClick={() => act(() => api.botStop())}>Stop</button>
              <button className="btn btn-danger" disabled={botBusy} onClick={() => act(() => api.botHalt('manual halt'))}>Kill switch</button>
            </>
          ) : (
            <button className="btn btn-primary" disabled={botBusy} onClick={() => act(() => api.botStart())}>Start bot</button>
          )}
          <button className="btn btn-ghost" disabled={botBusy} onClick={() => act(() => refreshBot())}>↻ Refresh</button>
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
        {botError && <div className="live-empty">{botError}</div>}

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
                  <input type="checkbox" checked={st.enabled} disabled={botBusy}
                    onChange={(e) => act(() => api.botToggleStrategy(st.id, e.target.checked))} />
                  <span className="slider" />
                </label>
              </div>
              <div className="acc-grid">
                <AccCard title="Paper trading accuracy" data={a.paper} />
                <AccCard title="Live trading accuracy" data={a.live} />
              </div>
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
