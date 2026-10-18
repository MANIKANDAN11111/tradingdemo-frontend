/**
 * Dashboard header.
 *
 * Uses the same brand block as the landing page: the amber gradient mark,
 * the tracked uppercase subtitle, and a pill cluster for the controls.
 * Only real navigation and real identity are shown — the user chip reflects
 * the signed-in account, and the pages menu only points at routes that exist.
 */
import { useEffect, useRef, useState } from 'react';

export default function Header({ user, onLogout, theme, onToggleTheme, onAddBroker }) {
  const name = user?.username || '';
  const isDark = theme === 'dark';
  const [pagesOpen, setPagesOpen] = useState(false);
  const pillsRef = useRef(null);

  // Close the pages menu on an outside click or on Escape.
  useEffect(() => {
    if (!pagesOpen) return undefined;
    const onPointerDown = (e) => {
      if (pillsRef.current && !pillsRef.current.contains(e.target)) setPagesOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPagesOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pagesOpen]);

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo-icon" aria-hidden="true">E</div>
        <div className="header-title">
          <h1>Esakki Pandi — Trading Dashboard</h1>
          <div className="subtitle">Groww · Fyers · CoinSwitch · live market feed</div>
        </div>
      </div>

      <div className="header-right">
        <div className="header-pills" ref={pillsRef}>
          <button
            className="pill-btn pill-solid"
            onClick={onAddBroker}
            title="Add Broker"
            aria-label="Add Broker"
          >
            ＋
          </button>
          <button
            className="pill-btn"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            className="pill-btn"
            onClick={() => setPagesOpen((v) => !v)}
            title="Pages"
            aria-label="Pages menu"
            aria-expanded={pagesOpen}
            aria-haspopup="menu"
          >
            ☰
          </button>

          {pagesOpen && (
            <div className="pages-floating-menu" role="menu">
              <a
                href="/dashboard"
                className="pages-menu-item active"
                role="menuitem"
                onClick={() => setPagesOpen(false)}
              >
                <span className="page-icon">📊</span> Dashboard
              </a>
              <a
                href="/login"
                className="pages-menu-item"
                role="menuitem"
                onClick={() => setPagesOpen(false)}
              >
                <span className="page-icon">🔑</span> Login
              </a>
            </div>
          )}
        </div>

        {name && (
          <div className="user-chip" title={`Signed in as ${name}`}>
            <span className="user-avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="user-name">{name}</span>
            <button className="logout-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">⏻</button>
          </div>
        )}
      </div>
    </header>
  );
}
