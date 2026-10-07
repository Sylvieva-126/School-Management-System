// src/components/ThemeToggle.jsx — data-theme on <html> + localStorage 'theme'
import { useState, useEffect } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <button
      className="btn-ghost"
      style={{ padding: '0.4rem 0.6rem' }}
      title="Toggle dark mode"
      onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
    >
      {theme === 'light' ? <FaMoon /> : <FaSun />}
    </button>
  );
}