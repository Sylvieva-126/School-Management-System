// import React, { useEffect, useState } from 'react';
// import { FiSun, FiMoon } from 'react-icons/fi';
//
// export default function ThemeToggle() {
// const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
//   useEffect(() => {
//     const currentTheme = document.documentElement.getAttribute('data-theme');
//     setIsDark(currentTheme === 'dark');
//   }, []);
//
//   const toggleTheme = () => {
//     const newTheme = isDark ? 'light' : 'dark';
//     document.documentElement.setAttribute('data-theme', newTheme);
//     localStorage.setItem('theme', newTheme);
//     setIsDark(!isDark);
//   };
//
//   return (
//     <button
//       className="btn-ghost"
//       onClick={toggleTheme}
//       aria-label="Toggle theme"
//       style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
//     >
//       {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
//     </button>
//   );
// }

import React, { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      className="btn-ghost"
      onClick={() => setIsDark(!isDark)}
      aria-label="Toggle theme"
      style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
    >
      {isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
    </button>
  );
}