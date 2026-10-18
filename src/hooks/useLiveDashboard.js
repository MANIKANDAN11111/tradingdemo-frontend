import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';

/**
 * Polls the backend aggregate endpoint. The dashboard keeps rendering the
 * bundled demo data if the backend is unreachable, so `error` is informational.
 */
export default function useLiveDashboard(pollMs = 15000) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const json = await api.dashboard();
      if (!mounted.current) return;
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      if (!mounted.current) return;
      const msg = e.message || 'Backend unreachable';
      // Distinguish network failure from API errors
      if (msg.includes('HTTP 200') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('Backend offline');
      } else {
        setError(msg);
      }
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

  return {
    data,
    error,
    loading,
    lastUpdated,
    refresh: load,
    connected: Boolean(data) && !error,
    auth: data?.auth ?? null,
  };
}
