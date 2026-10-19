import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import BrokerNavBar from './components/BrokerNavBar';
import BrokerDashboard from './components/BrokerDashboard';
import AddBrokerModal from './components/AddBrokerModal';
import CoinSwitchDashboard from './components/CoinSwitchDashboard';
import LoginPage from './components/LoginPage';
import TickerBar from './components/TickerBar';
import useMultiBrokerData from './hooks/useMultiBrokerData';
import { api } from './api/client';
import { isAuthorized, getSession, saveSession, clearSession } from './auth/session';

const POLL_MS = 3000;

function BootSplash() {
  return (
    <div className="boot-splash">
      <div className="brand-mark">E</div>
      <div className="boot-text">Checking session…</div>
    </div>
  );
}

function Dashboard({ theme, onToggleTheme, user, onLogout, onAddBroker, showAddBroker, setShowAddBroker }) {
  // Broker list from database + built-in brokers
  const [brokers, setBrokers] = useState([
    { id: 'groww', name: 'Groww', connected: false },
    { id: 'fyers', name: 'Fyers', connected: false },
    { id: 'coinswitch', name: 'CoinSwitch', connected: true },
  ]);
  const [activeBrokerId, setActiveBrokerId] = useState('groww');

  // Multi-broker data
  const { groww, fyers, loading, error, lastUpdated, refresh, fyersAuth, marketIndices } = useMultiBrokerData(POLL_MS);

  // Load custom brokers from database
  useEffect(() => {
    api.listBrokers()
      .then((d) => {
        const custom = (d.brokers || []).map((b) => ({
          id: `custom_${b.id}`,
          name: b.name,
          connected: b.status === 'connected',
          auth_type: b.auth_type,
        }));
        setBrokers((prev) => {
          const base = prev.filter((b) => !b.id.startsWith('custom_'));
          return [...base, ...custom];
        });
      })
      .catch(() => {});
  }, []);

  // Update connection status
  useEffect(() => {
    setBrokers((prev) => prev.map((b) => {
      if (b.id === 'groww') return { ...b, connected: Boolean(groww?.auth?.valid) };
      if (b.id === 'fyers') return { ...b, connected: Boolean(fyers) };
      return b;
    }));
  }, [groww, fyers]);

  const activeBroker = brokers.find((b) => b.id === activeBrokerId) || brokers[0];
  const activeData = activeBroker?.id === 'groww' ? groww : activeBroker?.id === 'fyers' ? fyers : activeBroker?.id === 'coinswitch' ? 'coinswitch' : null;

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content">
        <Header
          user={user}
          onLogout={onLogout}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onAddBroker={onAddBroker}
        />

        {/* Live market ticker — NIFTY, SENSEX, BANKNIFTY, etc. */}
        <TickerBar indices={marketIndices} live={true} />

        {/* Broker navigation tabs */}
        <BrokerNavBar
          brokers={brokers}
          activeBroker={activeBrokerId}
          onSelectBroker={setActiveBrokerId}
        />

        {/* Per-broker dashboard */}
        {activeBroker?.id === 'coinswitch' ? (
          <CoinSwitchDashboard />
        ) : (
          <BrokerDashboard broker={activeBroker} data={activeData} fyersAuth={fyersAuth} />
        )}

        {showAddBroker && (
          <AddBrokerModal
            onClose={() => setShowAddBroker(false)}
            onAdded={(broker) => {
              setBrokers((prev) => [...prev, {
                id: `custom_${broker.id}`,
                name: broker.name,
                connected: false,
                auth_type: broker.auth_type,
              }]);
            }}
          />
        )}

        <div className="footer">
          Esakki Pandi Dashboard · Groww &amp; Fyers · CoinSwitch live feeds · Built with React &amp; Bootstrap
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('jt-theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [booting, setBooting] = useState(true);
  const [showAddBroker, setShowAddBroker] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('jt-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    let alive = true;
    async function check() {
      if (!isAuthorized()) {
        if (alive) { setAuthorized(false); setBooting(false); }
        return;
      }
      try {
        const res = await api.verify();
        if (!alive) return;
        if (res?.valid && res?.user) {
          setUser(res.user);
          setAuthorized(true);
        } else {
          clearSession();
          setAuthorized(false);
        }
      } catch {
        if (!alive) return;
        const session = getSession();
        if (session) {
          setUser(session.user);
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } finally {
        if (alive) setBooting(false);
      }
    }
    check();
    return () => { alive = false; };
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const handleLogin = (session) => {
    saveSession(session.token, session.user, new Date(session.expiresAt).getTime());
    setUser(session.user);
    setAuthorized(true);
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    clearSession();
    setUser(null);
    setAuthorized(false);
  };

  if (booting) return <BootSplash />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={authorized ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/login"
        element={
          authorized
            ? <Navigate to="/dashboard" replace />
            : <LoginPage theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} />
        }
      />
      <Route
        path="/dashboard"
        element={
          authorized ? (
            <Dashboard
              theme={theme}
              onToggleTheme={toggleTheme}
              user={user}
              onLogout={handleLogout}
              onAddBroker={() => setShowAddBroker(true)}
              showAddBroker={showAddBroker}
              setShowAddBroker={setShowAddBroker}
            />
          ) : <Navigate to="/login" replace />
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
