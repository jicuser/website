import React from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun, Image, Search } from 'lucide-react';
import JamatiaLogo from './JamatiaLogo';
import { useAppearance } from '@/context/AppearanceContext';
export default function AppBrandHeader({ home = false }) {
  const { theme, toggleTheme } = useAppearance();
  return (
    <header className="jic-app-brand-header">
      <Link to="/" aria-label="Jamatia Islamic Centre home">
        <JamatiaLogo variant="wordmark" />
      </Link>
      <nav aria-label="App tools">
        {home && (
          <Link
            to="/prayer-times/monthly#phone-wallpaper"
            aria-label="Download timetable wallpaper"
          >
            <Image size={20} />
          </Link>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <Link to="/search" aria-label="Search JIC">
          <Search size={20} />
        </Link>
      </nav>
    </header>
  );
}
