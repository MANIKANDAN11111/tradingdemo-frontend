import { useState } from 'react';
import { api } from '../api/client';

/**
 * Modal to register a new broker.
 * The user enters a name, selects an auth type, and provides credentials.
 * Credentials are stored as a JSON object — the backend handles them per auth type.
 */
export default function AddBrokerModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [authType, setAuthType] = useState('api_key');
  const [creds, setCreds] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const authTypes = [
    { value: 'api_key', label: 'API Key + Secret', fields: ['apiKey', 'apiSecret'] },
    { value: 'oauth2', label: 'OAuth2 (redirect)', fields: ['appId', 'appSecret', 'redirectUri'] },
    { value: 'totp', label: 'Username + Password + TOTP', fields: ['username', 'password', 'totpSecret'] },
    { value: 'custom', label: 'Custom', fields: ['apiKey', 'apiSecret', 'extra'] },
  ];

  const currentType = authTypes.find((t) => t.value === authType) || authTypes[0];

  const setField = (field, value) => {
    setCreds((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Broker name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        auth_type: authType,
        credentials: creds,
      };
      const res = await api.addBroker(payload);
      onAdded?.(res.broker);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to add broker.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add Broker</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <label className="field">
            <span className="field-label">Broker Name</span>
            <input
              className="input"
              placeholder="e.g. Zerodha, Upstox, Angel One"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field-label">Auth Type</span>
            <select
              className="input"
              value={authType}
              onChange={(e) => { setAuthType(e.target.value); setCreds({}); }}
            >
              {authTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <div className="broker-fields">
            {currentType.fields.map((field) => (
              <label className="field" key={field}>
                <span className="field-label">{field}</span>
                <input
                  className="input"
                  type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('password') ? 'password' : 'text'}
                  placeholder={field}
                  value={creds[field] || ''}
                  onChange={(e) => setField(field, e.target.value)}
                />
              </label>
            ))}
          </div>

          {error && <div className="auth-notice err">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Adding...' : 'Add Broker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
