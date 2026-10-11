import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ variant = 'default' }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIsDark(next);
  };

  // Keep this toggle in sync if the theme was changed elsewhere (landing ↔ portal)
  useEffect(() => {
    const onStorage = e => {
      if (e.key === 'theme' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue);
        setIsDark(e.newValue === 'dark');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isNavy = variant === 'navy';   // for dark backgrounds (landing nav)

  return (
    <button onClick={toggle} aria-label="Toggle theme"
            style={{
              width: 38, height: 38, borderRadius: 10, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isNavy ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: isNavy ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
              color: isNavy ? '#F2F6FA' : 'var(--text)',
              fontSize: 16
            }}>
      {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
    </button>
  );
}