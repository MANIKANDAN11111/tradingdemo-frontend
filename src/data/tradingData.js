/**
 * Offline fallback ONLY.
 *
 * Every figure in the dashboard comes from the live backend (Groww for Indian
 * markets and account state, CoinSwitch for crypto). This file exists so the
 * index ticker does not collapse while the first request is in flight — and
 * `TickerBar` labels it "demo" whenever these values are on screen, so they are
 * never mistaken for live prices.
 */
export const tickerData = [
  { symbol: 'NIFTY', value: '—', change: '', direction: 'flat' },
  { symbol: 'SENSEX', value: '—', change: '', direction: 'flat' },
  { symbol: 'BANKNIFTY', value: '—', change: '', direction: 'flat' },
  { symbol: 'FINNIFTY', value: '—', change: '', direction: 'flat' },
  { symbol: 'MIDCPNIFTY', value: '—', change: '', direction: 'flat' },
];
