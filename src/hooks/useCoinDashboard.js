import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';

/** Polls the CoinSwitch aggregate endpoint every 15s. */
export default function useCoinDashboard(pollMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const json = await api.coinDashboard();
      if (!mounted.current) return;
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      if (!mounted.current) return;
      setError(e.message);
    } finally {
      if (mounted.current) setLoading(false);
    }
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

  return { data, error, loading, lastUpdated, refresh: load };
}
