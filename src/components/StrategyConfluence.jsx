/**
 * Live confluence readout for a multi-timeframe strategy.
 *
 * Everything here comes from the engine's last evaluation — the signal state,
 * the five mandatory gates, the eleven confluence factors, the structural
 * stop/target and the per-trade risk check. Factors whose feed is missing are
 * shown as unavailable rather than silently counted, which is what the
 * strategy spec requires (`missing_data_counts_as_positive: false`).
 */

const STATE_LABEL = {
  A_PLUS_PAPER_LONG_CALL_BIAS: { text: 'A+ LONG CALL', tone: 'bull' },
  A_PLUS_PAPER_SHORT_PUT_BIAS: { text: 'A+ SHORT PUT', tone: 'bear' },
  WATCH: { text: 'WATCH', tone: 'watch' },
  NO_TRADE: { text: 'NO TRADE', tone: 'flat' },
  DATA_UNAVAILABLE: { text: 'DATA UNAVAILABLE', tone: 'flat' },
};

function num(n, digits = 1) {
  return n == null ? '—' : Number(n).toFixed(digits);
}

function inr(n) {
  if (n == null) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function StrategyConfluence({ eval: ev }) {
  if (!ev) {
    return (
      <div className="conf-panel conf-idle">
        No evaluation yet — start the bot to begin scoring this strategy.
      </div>
    );
  }

  const state = STATE_LABEL[ev.state] || { text: ev.state, tone: 'flat' };
  const pct = ev.totalFactors ? Math.round((ev.score / ev.totalFactors) * 100) : 0;
  const gatesOk = (ev.gates || []).filter((g) => g.ok).length;
  const levels = ev.levels;
  const risk = ev.riskCheck;

  return (
    <div className="conf-panel">
      <div className="conf-head">
        <span className={`conf-state ${state.tone}`}>{state.text}</span>
        <span className="conf-detail">{ev.detail}</span>
      </div>

      <div className="conf-score">
        <div className="conf-score-label">
          Confluence <b>{ev.score}</b>/{ev.totalFactors}
          <span className="conf-min">min {ev.minConfluence}</span>
        </div>
        <div className="conf-bar">
          <div
            className={`conf-bar-fill ${ev.score >= ev.minConfluence ? 'pass' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* The five mandatory rules — all must hold before any entry. */}
      <div className="conf-section">
        <div className="conf-section-title">
          Mandatory rules <span className={`conf-count ${gatesOk === 5 ? 'pass' : ''}`}>{gatesOk}/5</span>
        </div>
        {(ev.gates || []).map((g) => (
          <div className={`conf-gate ${g.ok ? 'pass' : 'fail'}`} key={g.rule}>
            <span className="conf-mark">{g.ok ? '✓' : '✕'}</span>
            <span className="conf-gate-rule">{g.rule}</span>
            {g.detail && <span className="conf-gate-detail">{g.detail}</span>}
          </div>
        ))}
      </div>

      {/* Structural levels, when the setup produced them. */}
      {levels && (
        <div className="conf-section">
          <div className="conf-section-title">Structural levels</div>
          <div className="conf-levels">
            <div><span>Stop</span><b>{num(levels.stop)}</b></div>
            <div><span>Target</span><b>{num(levels.target)}</b></div>
            <div><span>Risk / unit</span><b>{num(levels.riskDistance)}</b></div>
            <div><span>Reward : risk</span><b>{num(levels.rewardRisk, 2)}</b></div>
          </div>
          {risk && (
            <div className={`conf-risk ${risk.fits ? 'pass' : 'fail'}`}>
              1 lot risks {inr(risk.minLotRisk)} against a {inr(risk.riskBudget)} budget
              {risk.fits ? ' — within the per-trade cap' : ' — over the per-trade cap, so this setup is not tradeable'}
            </div>
          )}
        </div>
      )}

      {/* All eleven factors, with unavailable feeds marked rather than faked. */}
      <div className="conf-section">
        <div className="conf-section-title">
          Confluence factors
          {ev.unavailableFactors?.length > 0 && (
            <span className="conf-unavail">{ev.unavailableFactors.length} feed(s) unavailable</span>
          )}
        </div>
        <div className="conf-factors">
          {(ev.factors || []).map((f) => (
            <div
              className={`conf-factor ${f.met ? 'met' : f.available ? 'miss' : 'na'}`}
              key={f.name}
              title={f.detail || ''}
            >
              <span className="conf-factor-mark">{f.met ? '●' : f.available ? '○' : '–'}</span>
              <span className="conf-factor-name">{f.name}</span>
              {f.detail && <span className="conf-factor-detail">{f.detail}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
