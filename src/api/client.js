/**
 * Thin API client for the Node backend in ../server.
 * In dev, Vite proxies /api to http://localhost:5000.
 * Attaches the session token to every authenticated request.
 */
import { getSession, clearSession } from '../auth/session';

async function get(path, { timeoutMs = 12000, auth = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (auth) {
      const session = getSession();
      if (session) headers['Authorization'] = `Bearer ${session.token}`;
    }
    const res = await fetch(`/api${path}`, { signal: controller.signal, headers });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Non-JSON response from ${path}`);
    }
    if (res.status === 401 && auth) {
      clearSession(); // token expired or was revoked — force re-login
    }
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `HTTP ${res.status} on ${path}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

/** Authenticated DELETE. */
async function del(path, { timeoutMs = 12000, auth = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {};
    if (auth) {
      const session = getSession();
      if (session) headers['Authorization'] = `Bearer ${session.token}`;
    }
    const res = await fetch(`/api${path}`, { method: 'DELETE', signal: controller.signal, headers });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Non-JSON response from ${path}`);
    }
    if (res.status === 401 && auth) clearSession();
    if (!res.ok || json?.ok === false) {
      throw new Error(json?.error || `HTTP ${res.status} on ${path}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  health: () => get('/health'),

  // --- auth gate (PostgreSQL-backed users) ---
  login: async ({ username, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on /auth/login`);
    }
    return json;
  },
  register: async ({ username, email, password }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on /auth/register`);
    }
    return json;
  },
  verify: () => get('/auth/verify'),
  logout: async () => {
    const session = getSession();
    if (session) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      }).catch(() => {});
    }
    clearSession();
  },

  // --- user management ---
  listUsers: () => get('/users'),
  deleteUser: (id) => del(`/users/${id}`),

  authStatus: () => get('/auth/status'),
  refreshToken: async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    return res.json();
  },

  // --- groww ---
  dashboard: () => get('/dashboard'),
  indices: () => get('/market/indices'),
  holdings: () => get('/portfolio/holdings'),
  positions: (segment = 'CASH') => get(`/portfolio/positions?segment=${segment}`),
  margins: () => get('/portfolio/margins'),
  orders: (segment = 'CASH', pageSize = 50) => get(`/orders?segment=${segment}&pageSize=${pageSize}`),
  quote: (symbol, exchange = 'NSE') => get(`/market/quote?exchange=${exchange}&symbol=${symbol}`),
  ltp: (symbols) => get(`/market/ltp?symbols=${encodeURIComponent([].concat(symbols).join(','))}`),

  // --- bot ---
  botStatus: () => get('/bot/status'),
  botAnalytics: () => get('/bot/analytics'),
  botAnalyticsSummary: () => get('/bot/analytics/summary'),
  botLog: () => get('/bot/log'),
  botTrades: () => get('/bot/trades'),
  botPositions: () => get('/bot/positions'),
  botOrders: () => get('/bot/orders'),
  botEquity: () => get('/bot/equity'),
  botStart: async () => {
    const res = await fetch('/api/bot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.reason || json.error);
    return json;
  },
  botStop: async () => {
    const res = await fetch('/api/bot/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return res.json();
  },
  botHalt: async (reason) => {
    const res = await fetch('/api/bot/halt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    return res.json();
  },
  botSetMode: async (mode) => {
    const res = await fetch('/api/bot/mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
    const json = await res.json();
    if (!json.ok) throw new Error(json.reason || json.error);
    return json;
  },
  botArm: async () => {
    const res = await fetch('/api/bot/arm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.reason || json.error);
    return json;
  },
  botDisarm: async () => {
    const res = await fetch('/api/bot/disarm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    return res.json();
  },
  botToggleStrategy: async (id, enabled) => {
    const res = await fetch(`/api/bot/strategies/${id}/toggle`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    return res.json();
  },

  // --- brokers (generic) ---
  listBrokers: () => get('/brokers'),
  addBroker: async (payload) => {
    const res = await fetch('/api/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on /brokers`);
    }
    return json;
  },
  updateBroker: async (id, payload) => {
    const res = await fetch(`/api/brokers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on /brokers/${id}`);
    }
    return json;
  },
  updateBrokerStatus: async (id, status, message, connectedAt) => {
    const res = await fetch(`/api/brokers/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, message, connectedAt }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on /brokers/${id}/status`);
    }
    return json;
  },
  deleteBroker: async (id) => {
    const res = await fetch(`/api/brokers/${id}`, { method: 'DELETE' });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status} on DELETE /brokers/${id}`);
    }
    return json;
  },

  // --- fyers ---
  fyersAuthUrl: () => get('/fyers/auth-url'),
  fyersToken: (authCode) => get(`/fyers/token?auth_code=${encodeURIComponent(authCode)}`),
  fyersStatus: () => get('/fyers/status'),

  // --- coinswitch (crypto) ---
  coinStatus: () => get('/coin/status'),
  coinDashboard: () => get('/coin/dashboard'),
  coinTickers: (exchange = 'coinswitchx') => get(`/coin/tickers?exchange=${exchange}`),
  coinDepth: (symbol, exchange = 'coinswitchx') => get(`/coin/depth?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`),
  coinTrades: (symbol, exchange = 'coinswitchx') => get(`/coin/trades?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}`),
  coinCandles: (symbol, interval = 60, hours = 24, exchange = 'coinswitchx') =>
    get(`/coin/candles?exchange=${exchange}&symbol=${encodeURIComponent(symbol)}&interval=${interval}&hours=${hours}`),
};

export default api;
