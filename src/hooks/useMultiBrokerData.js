import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';

/**
 * Polls Groww + Fyers data simultaneously via Promise.allSettled.
 * One broker failing never blocks the other. Fyers returns null when
 * not connected. Auto-refreshes every 3 seconds by default.
 */
export default function useMultiBrokerData(pollMs = 3000) {
  const [groww, setGroww] = useState(null);
  const [fyers, setFyers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fyersAuth, setFyersAuth] = useState(null);
  const [marketIndices, setMarketIndices] = useState([]);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [dashboardResult, fyersStatusResult] = await Promise.allSettled([
      api.dashboard(),
      api.fyersStatus(),
    ]);

    if (!mounted.current) return;

    // --- Fyers connection check (informational, non-blocking) ---
    // fyersStatus returns { hasToken, valid, expiresAt, appId }. `valid` is the
    // authoritative flag; the others are kept as fallbacks for older payloads.
    if (fyersStatusResult.status === 'fulfilled') {
      const status = fyersStatusResult.value;
      const connected = Boolean(status?.valid ?? status?.hasToken);
      setFyersAuth(status);
      if (!connected) setFyers(null);
    }

    // --- Dashboard data (contains both Groww and Fyers payloads) ---
    if (dashboardResult.status === 'fulfilled') {
      const data = dashboardResult.value;

      setGroww({
        positions: data.positions ?? null,
        margins: data.margins ?? null,
        orders: data.orders ?? null,
      });

      // fyers is already { positions, funds, orders } or null from the server
      setFyers(data.fyers ?? null);
      setMarketIndices(data.indices ?? []);
      setError(null);
    } else {
      const msg =
        dashboardResult.reason?.message || 'Failed to fetch broker data';
      setError(msg);
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(load, pollMs);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [load, pollMs]);

  return {
    groww,
    fyers,
    loading,
    error,
    lastUpdated,
    refresh: load,
    /** Live Fyers token state from the backend, for the connection strip. */
    fyersAuth,
    /** Live index quotes (NIFTY, SENSEX, etc.) from the market data feed. */
    marketIndices,
  };
}
