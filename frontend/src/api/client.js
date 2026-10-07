// src/api/client.js — the single doorway for ALL backend requests.
//
// Auth model: per-tab token snapshot (module variable) + sessionStorage.
//   - sessionStorage survives refresh (F5) but dies with the tab,
//     so a NEW tab always lands on Login. ✔ her spec
//   - currentToken is set on load (module init) and on login
//     via setCurrentToken(). Every request attaches it as Bearer.

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// --- per-tab token snapshot ---
let currentToken = sessionStorage.getItem(TOKEN_KEY) || null; // set on load

export function setCurrentToken(token) {
  currentToken = token || null;
}

// --- session storage helpers (used by AuthContext) ---
export function getSession() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
    return token && user ? { token, user } : null;
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  setCurrentToken(token);
}

export function wipeSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  setCurrentToken(null);
}

// Pages where a 401 must NEVER redirect (login itself, activation, password change)
function isAuthPage() {
  const p = window.location.pathname;
  return p === '/login' || p === '/activate' || p === '/change-password';
}

function handle401() {
  // Wipe + redirect ONLY if this tab actually had a session
  // and we're not on an auth page. A wrong password at login is
  // also 401 — it must show inline, never redirect. ✔ her spec
  const hadSession = Boolean(sessionStorage.getItem(TOKEN_KEY));
  if (hadSession && !isAuthPage()) {
    wipeSession();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
}

// --- main fetch helper ---
// endpoint has NO /api prefix, e.g. apiFetch('/students?q=&page=1')
// JSON body must be pre-stringified by the caller.
export async function apiFetch(endpoint, options = {}) {
  const { responseType, headers = {}, body, ...rest } = options;

  let res;
  try {
    res = await fetch(`/api${endpoint}`, {
      ...rest,
      body,
      headers: {
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...(typeof body === 'string' && !headers['Content-Type']
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...headers,
      },
    });
  } catch {
    // fetch itself failed — server unreachable, not an API error
    throw new Error('Cannot reach the server. Is the backend running on port 8080?');
  }

  if (res.status === 401) handle401();

  // Blob downloads (report cards): auth header is required, so plain
  // <a href> links would fail — that's why this branch exists. ✔ gotcha #2
  if (responseType === 'blob') {
    if (!res.ok) {
      let message = 'Download failed';
      try {
        const errData = await res.json();
        if (errData.message) message = errData.message;
      } catch { /* error body wasn't JSON */ }
      throw new Error(message);
    }
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // err.message gets rendered in error-text divs everywhere. ✔ gotcha #12
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

// --- multipart uploads (report-card files) ---
// NEVER set Content-Type here: the browser must build it together
// with the FormData boundary, or the upload breaks. ✔ gotcha #1
export async function apiUpload(endpoint, formData) {
  let res;
  try {
    res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      body: formData,
    });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running on port 8080?');
  }

  if (res.status === 401) handle401();

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}