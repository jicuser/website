import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Search, Sparkles, Sun } from 'lucide-react';
import { useAppearance } from '@/context/AppearanceContext';
import '@/styles/floating-tools.css';

export default function FloatingPageTools({ placement = 'floating' }) {
  const { theme, toggleTheme, glassEnabled, toggleGlass } = useAppearance();
  const [hint, setHint] = useState(null);
  const timeout = useRef(null);
  useEffect(() => () => window.clearTimeout(timeout.current), []);

  function showHint(id, text) {
    window.clearTimeout(timeout.current);
    setHint({ id, text });
    timeout.current = window.setTimeout(() => setHint(null), 2400);
  }

  const themeLabel = theme === 'dark' ? 'Light mode' : 'Dark mode';
  const glassLabel = `Transparency ${glassEnabled ? 'off' : 'on'}`;
  const label = (id) => (
    <span className="jic-floating-hint" role="status" hidden={hint?.id !== id}>
      {hint?.id === id ? hint.text : ''}
    </span>
  );

  return (
    <nav
      className={`jic-floating-tools${placement === 'menu' ? ' jic-menu-tools' : ''}`}
      aria-label={placement === 'menu' ? 'Menu controls' : 'Page controls'}
    >
      <span className="jic-floating-tool">
        <Link
          to="/search"
          aria-label="Search site"
          onClick={() => showHint('search', 'Search')}
          onFocus={() => showHint('search', 'Search')}
          onPointerEnter={() => showHint('search', 'Search')}
        >
          <Search size={19} aria-hidden="true" />
        </Link>
        {label('search')}
      </span>
      <span className="jic-floating-tool">
        <button
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={() => {
            toggleTheme();
            showHint('theme', themeLabel);
          }}
          onFocus={() => showHint('theme', themeLabel)}
          onPointerEnter={() => showHint('theme', themeLabel)}
        >
          {theme === 'dark' ? (
            <Sun size={19} aria-hidden="true" />
          ) : (
            <Moon size={19} aria-hidden="true" />
          )}
        </button>
        {label('theme')}
      </span>
      <span className="jic-floating-tool">
        <button
          type="button"
          aria-label={`Turn transparency ${glassEnabled ? 'off' : 'on'}`}
          aria-pressed={glassEnabled}
          onClick={() => {
            toggleGlass();
            showHint('glass', glassLabel);
          }}
          onFocus={() => showHint('glass', glassLabel)}
          onPointerEnter={() => showHint('glass', glassLabel)}
        >
          <Sparkles size={19} aria-hidden="true" />
        </button>
        {label('glass')}
      </span>
    </nav>
  );
}
