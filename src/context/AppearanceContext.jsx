import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import LiquidGlassFilters from '@/components/shell/LiquidGlassFilters';

const AppearanceContext = createContext(null);

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function AppearanceProvider({ children }) {
  const [theme, setTheme] = useState(() => readStorage('jic-theme', 'dark'));
  const [glassEnabled, setGlassEnabled] = useState(() => readStorage('jic_glass_enabled', 'true') !== 'false');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.theme = theme;
    writeStorage('jic-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.surface = glassEnabled ? 'glass' : 'solid';
    writeStorage('jic_glass_enabled', String(glassEnabled));
  }, [glassEnabled]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
    glassEnabled,
    setGlassEnabled,
    toggleGlass: () => setGlassEnabled(current => !current),
  }), [theme, glassEnabled]);

  return <AppearanceContext.Provider value={value}><LiquidGlassFilters/>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return context;
}
