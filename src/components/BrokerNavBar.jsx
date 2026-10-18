/**
 * Broker tab navigation bar.
 *
 * Renders a horizontal tab strip — one tab per broker — with a status
 * indicator dot (green = connected, gray = disconnected). Works for any
 * broker array (Groww, Fyers, or dynamically added). Tabs wrap on
 * narrow viewports via flex-wrap.
 */
export default function BrokerNavBar({ brokers = [], activeBroker, onSelectBroker }) {
  if (!brokers.length) return null;

  return (
    <nav className="broker-nav" aria-label="Broker selection">
      {brokers.map((broker) => {
        const isActive = activeBroker === broker.id;
        const connected = broker.connected ?? broker.isConnected ?? false;

        return (
          <button
            key={broker.id}
            type="button"
            className={`broker-tab${isActive ? ' broker-tab-active' : ''}`}
            onClick={() => onSelectBroker?.(broker.id)}
            aria-pressed={isActive}
          >
            <span
              className={`broker-status-dot ${connected ? 'broker-status-dot-connected' : 'broker-status-dot-disconnected'}`}
              title={connected ? 'Connected' : 'Disconnected'}
            />
            <span className="broker-tab-label">{broker.name || broker.id}</span>
          </button>
        );
      })}
    </nav>
  );
}
