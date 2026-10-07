// src/main.jsx — entry point.
// Theme applied BEFORE render (her spec) so dark-mode users never
// see a light flash on load.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);