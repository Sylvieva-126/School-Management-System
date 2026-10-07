// src/auth/AuthContext.jsx — holds the logged-in user + sessionKey.
//
// sessionKey: changes on every login/logout. App.jsx uses it as the
// React `key` on <BrowserRouter>, so changing user remounts EVERYTHING
// and no old page state leaks between sessions. (her spec)

import { createContext, useContext, useState } from 'react';
import { apiFetch, saveSession, getSession, wipeSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // On load: restore user from sessionStorage (refresh = still logged in)
  const [user, setUser] = useState(getSession()?.user ?? null);
  const [sessionKey, setSessionKey] = useState(0);

  // POST /login {identifier, password} -> {token, role, name, mustChangePassword}
  // identifier = email OR phone OR admission number (backend handles all three)
  // A wrong password throws "Invalid credentials" from apiFetch — the login
  // page shows it inline; nothing redirects here (client.js guarantees that).
  async function login(identifier, password) {
    const data = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    const u = {
      name: data.name,
      role: data.role,
      mustChangePassword: data.mustChangePassword,
    };
    saveSession(data.token, u); // sessionStorage + token snapshot in one go
    setUser(u);
    setSessionKey((k) => k + 1);
    return u;
  }

  function logout() {
    wipeSession();
    setUser(null);
    setSessionKey((k) => k + 1); // remounts the whole app -> everyone lands on /login
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}