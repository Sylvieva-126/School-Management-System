// Token is SNAPSHOTTED per tab: each tab keeps the session it was loaded
// (or logged in) with, even if another tab in the same browser logs in as
// a different user. Session lives in sessionStorage — survives refresh,
// cleared when the tab closes, so a new tab always starts at Login.
let currentToken = sessionStorage.getItem('token');

export function setCurrentToken(token) {
  currentToken = token;
  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
}

function authHeaders() {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}

async function handle(res) {
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    if (res.status === 401) {
      sessionStorage.removeItem('user');
    }
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...authHeaders(),
  };

  const response = await fetch(`/api${endpoint}`, { ...options, headers });

  // 401: only kill the session if this tab HAD one and we're not on a public page.
  // A wrong password at login is ALSO a 401 — it must show "Invalid credentials",
  // not "Session expired" + reload.
  if (response.status === 401) {
    const hadSession = !!(currentToken || sessionStorage.getItem('user'));
    const path = window.location.pathname;
    const onPublicPage = path === '/login' || path === '/activate' || path === '/change-password';

    if (hadSession && !onPublicPage) {
      setCurrentToken(null);
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    // else: fall through — caller displays the backend message
  }

  if (response.status === 204) return null;

  if (options.responseType === 'blob') {
    if (!response.ok) throw new Error('Failed to download file');
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }
  return data;
}

// Multipart uploads (report cards): must NOT set Content-Type —
// the browser generates the boundary.
export async function apiUpload(endpoint, formData) {
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  if (res.status === 401) {
    setCurrentToken(null);
    sessionStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}