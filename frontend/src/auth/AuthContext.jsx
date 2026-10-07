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
//use stete allows  us to keep track of the session instaed or re reading on every rneder

  const login = (token, userData) => {
    setCurrentToken(token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };
// snapshot for this ab + mirror to sessionStorage

  const logout = () => {
    setCurrentToken(null);
    sessionStorage.removeItem('user');
    setUser(null);
  };
  // clears this tab's snapshot + sessionStorage

  // Stable identity use as React key on the shell to remount pages per session
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