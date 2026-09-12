import React, { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { readNavigationHistory, rememberPage } from '@/lib/navigationHistory';

const NavigationContext = createContext({ canGoBack: false, previousPath: null });

export function NavigationProvider({ children }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const entries = useRef(null);
  const [navigation, setNavigation] = useState({ canGoBack: false, previousPath: null });

  useLayoutEffect(() => {
    if (entries.current === null) {
      try {
        entries.current = readNavigationHistory(window.sessionStorage);
      } catch {
        entries.current = [];
      }
    }
    const index = window.history.state?.idx ?? 0;
    entries.current = rememberPage(entries.current, index, location.pathname, navigationType);
    setNavigation({
      canGoBack: index > 0,
      previousPath: entries.current.find((entry) => entry.index === index - 1)?.pathname ?? null,
    });
    try {
      // Keep only paths in this tab; query strings and form values are never stored.
      window.sessionStorage.setItem('jic-navigation-history', JSON.stringify(entries.current));
    } catch {
      // In-memory navigation still works when browser storage is unavailable.
    }
  }, [location, navigationType]);

  return <NavigationContext.Provider value={navigation}>{children}</NavigationContext.Provider>;
}

export const useNavigationHistory = () => useContext(NavigationContext);
