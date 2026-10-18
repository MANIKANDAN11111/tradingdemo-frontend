import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import AddBrokerModal from './AddBrokerModal';

/**
 * Dynamic broker list — loads all registered brokers from the database
 * and shows their connection status. Supports add/delete.
 */
export default function BrokerList() {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listBrokers();
      setBrokers(res.brokers || []);
    } catch (err) {
      setError(err.message || 'Failed to load brokers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this broker?')) return;
    try {
      await api.deleteBroker(id);
      setBrokers((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete broker.');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.updateBrokerStatus(id, status, status === 'connected' ? 'Manually connected' : 'Disconnected', status === 'connected' ? new Date().toISOString() : null);
      setBrokers((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const statusClass = (s) => s === 'connected' ? 'ok' : s === 'error' ? 'bad' : 'warn';
  const statusLabel = (s) => s === 'connected' ? 'Connected' : s === 'error' ? 'Error' : 'Not connected';

  return (
    <div className="broker-list-panel animate-in">
      <div className="broker-list-header">
        <h3 className="panel-title">Brokers</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} disabled={loading}>
          + Add Broker
        </button>
      </div>

      {error && <div className="auth-notice err">{error}</div>}

      {loading ? (
        <div className="live-empty">Loading brokers...</div>
      ) : brokers.length === 0 ? (
        <div className="live-empty">No brokers registered yet. Click "Add Broker" to get started.</div>
      ) : (
        <div className="broker-cards">
          {brokers.map((broker) => (
            <div className="broker-card" key={broker.id}>
              <div className="broker-card-header">
                <span className="broker-name">{broker.name}</span>
                <span className={`conn-status ${statusClass(broker.status)}`}>
                  {statusLabel(broker.status)}
                </span>
              </div>
              <div className="broker-card-meta">
                <span className="broker-auth-type">{broker.auth_type}</span>
                {broker.status_message && (
                  <span className="broker-status-msg">{broker.status_message}</span>
                )}
              </div>
              <div className="broker-card-actions">
                {broker.status === 'connected' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleStatusUpdate(broker.id, 'disconnected')}>
                    Disconnect
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(broker.id, 'connected')}>
                    Mark Connected
                  </button>
                )}
                <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(broker.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddBrokerModal
          onClose={() => setShowAdd(false)}
          onAdded={(broker) => setBrokers((prev) => [broker, ...prev])}
        />
      )}
    </div>
  );
}
