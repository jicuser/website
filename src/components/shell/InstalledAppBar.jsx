import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Menu, Settings } from 'lucide-react';
import { useNavigationHistory } from '@/context/NavigationContext';
import '@/styles/installed-app-bar.css';

export default function InstalledAppBar({ open, view, onOpen }) {
  const [installed, setInstalled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { canGoBack } = useNavigationHistory();

  useEffect(() => {
    const query = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(query.matches || window.navigator.standalone === true);
    update();
    query.addEventListener('change', update);
    window.addEventListener('pageshow', update);
    return () => {
      query.removeEventListener('change', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);

  useEffect(() => {
    if (!installed) return undefined;
    document.documentElement.dataset.installedNavigation = 'true';
    return () => {
      delete document.documentElement.dataset.installedNavigation;
    };
  }, [installed]);

  if (!installed) return null;
  return (
    <nav className="jic-installed-app-bar" aria-label="App navigation">
      <Link
        to="/"
        aria-current={pathname === '/' ? 'page' : undefined}
        onClick={() => {
          if (pathname === '/') window.scrollTo({ top: 0, behavior: 'auto' });
        }}
      >
        <Home size={21} aria-hidden="true" />
        <span>Home</span>
      </Link>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls="jic-site-menu"
        aria-expanded={open && view === 'navigation'}
        onClick={() => onOpen('navigation')}
      >
        <Menu size={21} aria-hidden="true" />
        <span>Menu</span>
      </button>
      <button
        type="button"
        disabled={!canGoBack && pathname === '/'}
        onClick={() => (canGoBack ? navigate(-1) : navigate('/', { replace: true }))}
      >
        <ArrowLeft size={21} aria-hidden="true" />
        <span>Back</span>
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls="jic-site-menu"
        aria-expanded={open && view === 'appearance'}
        onClick={() => onOpen('appearance')}
      >
        <Settings size={21} aria-hidden="true" />
        <span>Settings</span>
      </button>
    </nav>
  );
}
