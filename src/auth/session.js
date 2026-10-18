/**
 * Client-side session for the login gate.
 * The token is signed and verified server-side; this is just the local cache.
 */

const TOKEN_KEY = 'jt-session-token';
const USER_KEY = 'jt-session-user';
const EXPIRY_KEY = 'jt-session-expiry';

export function getSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) || 0);
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      user = null;
    }
    if (!token || !user || !expiry || expiry < Date.now()) return null;
    return { token, user, expiresAt: expiry };
  } catch {
    return null;
  }
}

/** Quick local check — the authoritative check is GET /api/auth/verify. */
export function isAuthorized() {
  return getSession() !== null;
}

export function saveSession(token, user, expiresAt) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(EXPIRY_KEY, String(expiresAt));
  } catch {
    // storage unavailable
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  } catch {
    // ignore
  }
}
