import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { saveSession } from '../auth/session';
import { directionOf, formatPct } from '../utils/format';

const FALLBACK_TICKER = [
  { symbol: 'NIFTY 50', value: '23,146.15', change: '+0.65%' },
  { symbol: 'SENSEX', value: '74,729.27', change: '+0.56%' },
  { symbol: 'BANKNIFTY', value: '55,844.00', change: '+0.06%' },
  { symbol: 'BTC/INR', value: '81,39,442', change: '-1.05%' },
  { symbol: 'ETH/INR', value: '2,44,341', change: '-1.41%' },
  { symbol: 'USD/INR', value: '100.44', change: '-0.22%' },
  { symbol: 'GOLD', value: '72,480', change: '+0.34%' },
  { symbol: 'CRUDE OIL', value: '5,842', change: '-0.87%' },
];

/**
 * Flip to true to bring back the "Add User" tab and the Database Users panel.
 * Kept off for now so the login page is just a login page.
 */
const SHOW_USER_MANAGEMENT = false;

/**
 * Login gate.
 *  - Sign In: username + password, verified against the PostgreSQL user store.
 *  - Add User: create a new account in the database.
 *  - Users: list and remove accounts.
 */
export default function LoginPage({ theme, onToggleTheme, onLogin }) {
  const [tab, setTab] = useState('signin');
  const [ticker, setTicker] = useState(FALLBACK_TICKER);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [signin, setSignin] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [cfg, setCfg] = useState({ username: '', email: '', password: '' });
  const [showCfgPassword, setShowCfgPassword] = useState(false);

  const [users, setUsers] = useState([]);

  // Live index ticker when the backend is reachable; falls back to static.
  useEffect(() => {
    let alive = true;
    api.dashboard()
      .then((d) => {
        if (!alive || !d?.indices?.length) return;
        const rows = d.indices.map((i) => ({
          symbol: i.label,
          value: Number(i.ltp).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
          change: formatPct(i.changePct),
        }));
        if (rows.length) setTicker(rows);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const refreshUsers = useCallback(() => {
    api.listUsers()
      .then((d) => setUsers(d?.users || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (SHOW_USER_MANAGEMENT) refreshUsers();
  }, [refreshUsers]);

  const flash = (text, kind = 'ok') => {
    setNotice({ text, kind });
    setTimeout(() => setNotice(null), 3200);
  };

  /**
   * Authorize against the database.
   *  - success → store the session and redirect to the dashboard
   *  - failure → stay on the login page with the reason
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!signin.username.trim() || !signin.password) {
      flash('Enter your username and password.', 'err');
      return;
    }
    setBusy(true);
    try {
      const res = await api.login({ username: signin.username.trim(), password: signin.password });
      saveSession(res.token, res.user, new Date(res.expiresAt).getTime());
      onLogin?.(res); // authorized → redirect to dashboard
    } catch (err) {
      flash(err?.message || 'Invalid username or password.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!cfg.username.trim() || !cfg.password) {
      flash('A username and password are required.', 'err');
      return;
    }
    setBusy(true);
    try {
      await api.register({ username: cfg.username.trim(), email: cfg.email.trim(), password: cfg.password });
      flash(`User "${cfg.username.trim()}" created.`);
      setCfg({ username: '', email: '', password: '' });
      refreshUsers();
    } catch (err) {
      flash(err?.message || 'Could not create user.', 'err');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.deleteUser(id);
      flash('User removed.');
      refreshUsers();
    } catch (err) {
      flash(err?.message || 'Could not remove user.', 'err');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="login-screen">
      <button className="theme-toggle login-theme-corner" onClick={onToggleTheme} aria-label="Toggle theme">
        {isDark ? '☀️' : '🌙'}
      </button>
      <div className="login-bg" aria-hidden="true">
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="aurora aurora-c" />
        <div className="bg-grid" />
      </div>

      <div className="login-layout">
        {/* LEFT — branding */}
        <section className="login-brand">
          <div className="brand-top">
            <div className="brand-mark">E</div>
            <div>
              <div className="brand-name">Esakki Pandi</div>
              <div className="brand-sub">Algorithmic Trading Suite</div>
            </div>
          </div>

          <h1 className="brand-headline">
            Trade the open.<br />
            <span className="grad-text">Every second counts.</span>
          </h1>
          <p className="brand-copy">
            Five strategies across NIFTY and BANKNIFTY — ORB, Trend, Swing and EOD —
            streamed live from Groww, Fyers and CoinSwitch into one desk.
          </p>

          <div className="ticker-tape" aria-hidden="true">
            <div className="tape-track">
              {[...ticker, ...ticker].map((t, i) => (
                <span className="tape-item" key={`${t.symbol}-${i}`}>
                  <span className="tape-symbol">{t.symbol}</span>
                  <span className="tape-value">{t.value}</span>
                  <span className={`tape-change ${directionOf(t.change)}`}>{t.change}</span>
                </span>
              ))}
            </div>
          </div>

          <ul className="brand-points">
            <li><span className="bp-icon">⚡</span> ORB &amp; Trend engines with live P&amp;L</li>
            <li><span className="bp-icon">🛡️</span> Paper and live modes, multi-broker</li>
            <li><span className="bp-icon">₿</span> Crypto depth, candles and trades</li>
          </ul>
        </section>

        {/* RIGHT — auth + user management */}
        <section className="login-auth">
          <div className="auth-card">
            {SHOW_USER_MANAGEMENT && (
              <div className="auth-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={tab === 'signin'}
                  className={`auth-tab ${tab === 'signin' ? 'active' : ''}`}
                  onClick={() => setTab('signin')}
                >
                  Sign In
                </button>
                <button
                  role="tab"
                  aria-selected={tab === 'add'}
                  className={`auth-tab ${tab === 'add' ? 'active' : ''}`}
                  onClick={() => setTab('add')}
                >
                  Add User
                </button>
              </div>
            )}

            {notice && <div className={`auth-notice ${notice.kind}`}>{notice.text}</div>}

            {tab === 'signin' || !SHOW_USER_MANAGEMENT ? (
              <form className="auth-form" onSubmit={handleLogin}>
                <label className="field">
                  <span className="field-label">Username</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. admin"
                    value={signin.username}
                    onChange={(e) => setSignin({ ...signin, username: e.target.value })}
                    autoComplete="username"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Password</span>
                  <div className="input-wrap">
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={signin.password}
                      onChange={(e) => setSignin({ ...signin, password: e.target.value })}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <button type="submit" className="login-btn" disabled={busy}>
                  {busy ? 'Authorizing…' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleAddUser}>
                <label className="field">
                  <span className="field-label">Username</span>
                  <input
                    className="input"
                    type="text"
                    placeholder="new username"
                    value={cfg.username}
                    onChange={(e) => setCfg({ ...cfg, username: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Email <span className="optional">(optional)</span></span>
                  <input
                    className="input"
                    type="email"
                    placeholder="user@example.com"
                    value={cfg.email}
                    onChange={(e) => setCfg({ ...cfg, email: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Password</span>
                  <div className="input-wrap">
                    <input
                      className="input"
                      type={showCfgPassword ? 'text' : 'password'}
                      placeholder="set a password"
                      value={cfg.password}
                      onChange={(e) => setCfg({ ...cfg, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="eye-btn"
                      onClick={() => setShowCfgPassword((s) => !s)}
                      aria-label="Toggle password visibility"
                    >
                      {showCfgPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>

                <button type="submit" className="login-btn" disabled={busy}>
                  {busy ? 'Creating…' : 'Create User'}
                </button>
                <p className="auth-hint">
                  New accounts are stored in the PostgreSQL database and can sign in immediately.
                </p>
              </form>
            )}
          </div>

          {/* user list (hidden while user management is off) */}
          {SHOW_USER_MANAGEMENT && (
            <div className="saved-configs">
              <div className="saved-head">
                <span>Database Users</span>
                <span className="saved-count">{users.length}</span>
              </div>
              <div className="saved-list">
                {users.map((u) => (
                  <div className="config-card" key={u.id}>
                    <div className="config-main">
                      <span className="broker-mark">{(u.username || '?').charAt(0).toUpperCase()}</span>
                      <div className="config-text">
                        <div className="config-label">{u.username}</div>
                        <div className="config-meta">
                          {u.email || 'no email'} · {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : ''}
                        </div>
                      </div>
                    </div>
                    <div className="config-actions">
                      <button className="config-delete" onClick={() => handleDeleteUser(u.id)} aria-label="Delete user">✕</button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <span className="live-empty">No users in the database yet.</span>}
              </div>
            </div>
          )}

          <div className="auth-foot">
            <span>PostgreSQL backed</span>
            <span className="auth-dot" />
            <span>scrypt hashed</span>
          </div>
        </section>
      </div>
    </div>
  );
}
