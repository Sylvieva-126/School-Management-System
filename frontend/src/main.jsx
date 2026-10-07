import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Apply saved theme BEFORE first render (no flash of wrong theme)
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);