'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  localStorage.setItem('ll-theme', next);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('ll-theme');
    const next: Theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="theme-pair" role="group" aria-label="Theme">
      <button type="button" aria-pressed={theme === 'light'} aria-label="Light" onClick={() => choose('light')}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" aria-pressed={theme === 'dark'} aria-label="Dark" onClick={() => choose('dark')}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4 6.2 6.2 0 0 0 20 14.5z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
