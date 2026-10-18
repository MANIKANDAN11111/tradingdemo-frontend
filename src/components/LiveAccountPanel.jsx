function fmtMoney(n, digits = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function pnlClass(n) {
  const v = Number(n ?? 0);
  if (v > 0) return 'profit';
  if (v < 0) return 'loss';
  return 'neutral';
}

function signed(n) {
  const v = Number(n ?? 0);
  return `${v > 0 ? '+' : ''}${fmtMoney(v)}`;
}

/**
 * Groww live account.
 *
 * Groww returns every F&O position touched today. A position that was opened
 * and fully closed has net quantity 0 but keeps its realised P&L (and shows
 * creditQuantity === debitQuantity). Those are squared-off trades, not open
 * ones, so they are listed separately — otherwise a column of "Qty 0" reads
 * like a bug.
 */
export default function LiveAccountPanel({ data, error, loading, lastUpdated, onRefresh }) {
  const auth = data?.auth;
  const funds = data?.funds;
  const positions = data?.positions?.fno ?? [];

  const isClosed = (p) => Number(p.quantity ?? 0) === 0;
  const openPositions = positions.filter((p) => !isClosed(p));
  const closedPositions = positions.filter(isClosed);

  const realised = data?.positions?.realisedPnl ?? 0;

  const statusLabel = error
    ? 'Backend offline'
    : loading
      ? 'Connecting…'
      : auth?.valid
        ? 'Connected'
        : 'Token expired';

  const statusClass = error ? 'bad' : auth?.valid ? 'ok' : data?.partial ? 'warn' : 'bad';

  return (
    <section className="live-panel">
      <div className="section-header">
        <div className="section-title">
          <span className="icon" style={{ background: 'var(--accent-cyan-light)' }}>🔌</span>
          Groww Live Account
        </div>
        <div className="live-panel-meta">
          <span className={`conn-status ${statusClass}`}>● {statusLabel}</span>
          {auth?.sessionName && <span className="live-meta-text">session {auth.sessionName}</span>}
          {lastUpdated && (
            <span className="live-meta-text">
              updated {lastUpdated.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          )}
          <button className="conn-btn" onClick={onRefresh} type="button">↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div className="live-error">
          <strong>Live data unavailable.</strong> {error}
          <div className="live-error-hint">
            Start the backend with <code>cd server &amp;&amp; npm start</code>.
          </div>
        </div>
      )}

      {data?.errors?.length > 0 && (
        <div className="live-error">
          <strong>Partial data:</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {data.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {funds && (
        <div className="funds-grid">
          <div className="fund-card">
            <div className="fund-label">Clear Cash</div>
            <div className="fund-value">{fmtMoney(funds.clearCash)}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Net Margin Used</div>
            <div className="fund-value">{fmtMoney(funds.netMarginUsed)}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Collateral Available</div>
            <div className="fund-value">{fmtMoney(funds.collateralAvailable)}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Collateral Used</div>
            <div className="fund-value">{fmtMoney(funds.collateralUsed)}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Open F&amp;O Positions</div>
            <div className="fund-value">{openPositions.length}</div>
          </div>
          <div className="fund-card">
            <div className="fund-label">Realised P&amp;L</div>
            <div className={`fund-value ${pnlClass(realised)}`}>{signed(realised)}</div>
          </div>
        </div>
      )}

      {/* Open positions — the ones still carrying market risk */}
      <div className="live-subhead">
        Open F&amp;O positions <span className="section-badge">{openPositions.length}</span>
      </div>

      {openPositions.length > 0 ? (
        <div className="trades-table-wrap">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Exchange</th>
                <th>Product</th>
                <th className="num">Qty</th>
                <th className="num">Net Price</th>
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
                  <td className="num">{fmtMoney(p.netPrice)}</td>
                  <td className={`num ${Number(p.realisedPnl) >= 0 ? 'up' : 'down'}`}>
                    {signed(p.realisedPnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && !error && (
          <div className="live-empty">
            No open F&amp;O positions — nothing is currently carrying market risk.
          </div>
        )
      )}

      {/* Squared-off trades: net quantity is 0, so show what was bought and sold */}
      {closedPositions.length > 0 && (
        <>
          <div className="live-subhead">
            Squared off today <span className="section-badge">{closedPositions.length}</span>
          </div>
          <div className="trades-table-wrap">
            <table className="trades-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Exchange</th>
                  <th>Product</th>
                  <th className="num">Bought</th>
                  <th className="num">Sold</th>
                  <th className="num">Avg Price</th>
                  <th className="num">Realised P&amp;L</th>
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
                    <td className="num">{fmtMoney(p.netPrice)}</td>
                    <td className={`num ${Number(p.realisedPnl) >= 0 ? 'up' : 'down'}`}>
                      {signed(p.realisedPnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="live-note">
            Net quantity is 0 because each of these was opened and closed in equal size
            today. Groww keeps the row for the session to carry its realised P&amp;L.
          </div>
        </>
      )}
    </section>
  );
}
