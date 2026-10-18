/**
 * Broker connection strip.
 *
 * Shows Groww and Fyers status side by side. Each row is driven entirely by
 * the live token state from the backend — no invented broker rows.
 */
import { useState } from 'react';
import { api } from '../api/client';

export default function ConnectionPanel({ auth, live, error, fyersAuth }) {
  const [fyersBusy, setFyersBusy] = useState(false);
  const [fyersMsg, setFyersMsg] = useState(null);

  // Backend is live but Groww token may be missing/expired
  const backendOnline = live || (error && !error.includes('Backend offline'));
  const growwConnected = auth?.valid;
  const fyersConnected = fyersAuth?.valid;

  const status = growwConnected ? 'ok' : backendOnline ? 'warn' : 'bad';

  const statusText = growwConnected
    ? `● ${auth.sessionName || 'Connected'}`
    : backendOnline
      ? '● Backend online — Groww token missing'
      : '● Backend offline';

  const meta = growwConnected
    ? auth?.expiresAt ? `token valid until ${new Date(auth.expiresAt).toLocaleString('en-IN', { hour12: false })}` : ''
    : backendOnline
      ? 'login to Groww to see live data'
      : 'start the server to go live';

  /**
   * Fyers OAuth2 flow:
   * 1. Get auth URL from backend
   * 2. Open it in a new tab — user authorizes on Fyers
   * 3. Fyers redirects to /api/fyers/callback with ?auth_code=XXX
   * 4. We exchange the code for a token
   */
  const handleFyersConnect = async () => {
    setFyersBusy(true);
    setFyersMsg(null);
    try {
      const { url } = await api.fyersAuthUrl();
      // Open Fyers auth page in a new tab
      window.open(url, '_blank', 'width=600,height=700');
      setFyersMsg('Authorize in the popup, then paste the auth_code below.');
    } catch (e) {
      setFyersMsg(`Error: ${e.message}`);
    } finally {
      setFyersBusy(false);
    }
  };

  const handleFyersToken = async (authCode) => {
    setFyersBusy(true);
    setFyersMsg(null);
    try {
      const res = await api.fyersToken(authCode.trim());
      setFyersMsg('Connected! Refresh the page to see live data.');
    } catch (e) {
      setFyersMsg(`Token exchange failed: ${e.message}`);
    } finally {
      setFyersBusy(false);
    }
  };

  return (
    <div className="conn-panel animate-in">
      <div className="conn-grid">
        <div className="conn-item">
          <span className="conn-label">Groww</span>
          <span className={`conn-status ${status}`}>{statusText}</span>
          {meta && <span className="conn-meta">{meta}</span>}
        </div>
        <div className="conn-item">
          <span className="conn-label">Fyers</span>
          <span className={`conn-status ${fyersConnected ? 'ok' : 'warn'}`}>
            {fyersConnected ? `● Connected (${fyersAuth.appId || ''})` : '● Not connected'}
          </span>
          <span className="conn-meta">
            {fyersConnected ? 'live data active' : 'authorize to see live data'}
          </span>
          {!fyersConnected && (
            <div className="fyers-connect">
              <button
                className="btn btn-primary"
                onClick={handleFyersConnect}
                disabled={fyersBusy}
              >
                Connect Fyers
              </button>
              {fyersMsg && <span className="fyers-msg">{fyersMsg}</span>}
              <FyersAuthCodeInput onToken={handleFyersToken} busy={fyersBusy} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FyersAuthCodeInput({ onToken, busy }) {
  const [code, setCode] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onToken(code);
    setCode('');
  };

  return (
    <form className="fyers-code-form" onSubmit={submit}>
      <input
        type="text"
        className="input fyers-code-input"
        placeholder="Paste auth_code here"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button type="submit" className="btn btn-ghost" disabled={busy || !code.trim()}>
        Save Token
      </button>
    </form>
  );
}
