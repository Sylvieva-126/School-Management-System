import React, { createContext, useContext, useState } from 'react';
import { setCurrentToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user'));
      return localStorage.getItem('token') && saved ? saved : null;
    } catch { return null; }
  });

  const login = (token, userData) => {
    setCurrentToken(token);                       // snapshot for THIS tab + mirror to localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    setCurrentToken(null);                        // clears this tab's snapshot + localStorage
    localStorage.removeItem('user');
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