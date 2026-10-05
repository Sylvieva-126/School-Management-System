import React, { createContext, useContext, useState } from 'react';
import { setCurrentToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('user'));
      return sessionStorage.getItem('token') && saved ? saved : null;
    } catch { return null; }
  });

  const login = (token, userData) => {
    setCurrentToken(token);                       // snapshot for THIS tab + mirror to sessionStorage
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    setCurrentToken(null);                        // clears this tab's snapshot + sessionStorage
    sessionStorage.removeItem('user');
    setUser(null);
  };

  // Stable identity — use as React key on the shell to remount pages per session
  const sessionKey = user ? `${user.role}-${user.name}` : 'anon';

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}