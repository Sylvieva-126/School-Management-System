// Token is snapshotted per tab: each tab keeps the session it was loaded
let currentToken = sessionStorage.getItem('token');

export function setCurrentToken(token) {
  currentToken = token;
  if (token) {
    sessionStorage.setItem('token', token);
  } else {
    sessionStorage.removeItem('token');
  }
}
//module lets  token be saved in session (lets for diff session)
function authHeaders() {
  return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
}

async function handle(res) {
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
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

  // 401: only kill the session if this tab had one and we're not on a public page. a wrong password at login is a 401
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
    // else: fall through , caller displays the backend message
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

// multipart uploads (report cards):
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