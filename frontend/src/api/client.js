//export async function apiFetch(endpoint, options = {}) {
//  const token = localStorage.getItem('token');
//  const headers = {
//    'Content-Type': 'application/json',
//    ...options.headers,
//  };
//
//  if (token) {
//    headers['Authorization'] = `Bearer ${token}`;
//  }
//
//  const config = {
//    ...options,
//    headers,
//  };
//
//  const response = await fetch(`/api${endpoint}`, config);
//
//  if (response.status === 401) {
//    const hadSession = !!(localStorage.getItem('token') || localStorage.getItem('user'));
//    const onPublicPage = window.location.pathname === '/login'
//      || window.location.pathname === '/activate'
//      || window.location.pathname === '/change-password';
//
//    // Only nuke the session if we HAD one and we're not mid-login
//    if (hadSession && !onPublicPage) {
//      localStorage.removeItem('token');
//      localStorage.removeItem('user');
//      window.location.href = '/login';
//      throw new Error('Session expired. Please log in again.');
//    }
//    // Otherwise: fall through — the caller's setError shows the real message
//  }
//
//  // Handle 204 No Content
//  if (response.status === 204) {
//    return null;
//  }
//
//  // Handle Blob responses (e.g., PDF, CSV)
//  if (options.responseType === 'blob') {
//    if (!response.ok) throw new Error('Failed to download file');
//    return response.blob();
//  }
//
//  const data = await response.json().catch(() => ({}));
//
//  if (!response.ok) {
//    throw new Error(data.message || 'Something went wrong');
//  }
//
//  return data;
//}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`/api${endpoint}`, config);

  // 401: only kill the session if we HAD one and we're not on a public page.
  // Wrong password at login is ALSO a 401 — it must show "Invalid credentials",
  // not "Session expired" + reload.
  if (response.status === 401) {
    const hadSession = !!(localStorage.getItem('token') || localStorage.getItem('user'));
    const path = window.location.pathname;
    const onPublicPage = path === '/login' || path === '/activate' || path === '/change-password';

    if (hadSession && !onPublicPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    // else: fall through — caller displays the backend message
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  // Handle Blob responses (e.g., PDF report cards)
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
// the browser generates the boundary. apiFetch would corrupt the file.
export async function apiUpload(endpoint, formData) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}