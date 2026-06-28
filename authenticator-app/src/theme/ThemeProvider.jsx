import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * Detects the initial theme from localStorage or system preference.
 */
function detectInitialTheme() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark'; // default to dark (2FAuth style)
}

/**
 * Applies the theme by setting data-theme on <html>.
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const t = detectInitialTheme();
    applyTheme(t);
    return t;
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Also listen for OS-level preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      // Only follow system if user hasn't set a manual preference
      if (!localStorage.getItem('theme')) {
        const t = e.matches ? 'dark' : 'light';
        setThemeState(t);
        applyTheme(t);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * @returns {{ theme: string, toggleTheme: () => void, setTheme: (t: string) => void }}
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
