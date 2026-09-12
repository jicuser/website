import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Heart,
  Home,
  LogIn,
  Menu,
  Moon,
  Pause,
  Play,
  Sparkles,
  Sun,
  X,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { MADRASSAH_TABS, MASJID_EXTENSION_TABS, NAV_GROUPS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { useAppearance } from '@/context/AppearanceContext';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import { cn } from '@/lib/utils';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

const MENU_GROUPS = [
  ...NAV_GROUPS,
  { name: 'Madrassah', path: '/madrassah', children: MADRASSAH_TABS },
  { name: 'Social Media', path: '/social-media', children: [] },
];

// Related routes share one group of section links.
function activeNavigation(pathname) {
  if (pathname === '/madrassah' || pathname.startsWith('/madrassah/'))
    return { name: 'Madrassah', children: MADRASSAH_TABS };
  if (
    pathname === '/projects/masjid-extension' ||
    MASJID_EXTENSION_TABS.slice(1).some((item) => item.path === pathname)
  )
    return { name: 'Masjid Extension', children: MASJID_EXTENSION_TABS };
  if (['/team', '/contact', '/financial-history', '/social-media'].includes(pathname))
    return NAV_GROUPS.find((item) => item.name === 'About');
  if (pathname.startsWith('/funerals')) return NAV_GROUPS.find((item) => item.name === 'Services');
  return NAV_GROUPS.find((item) =>
    item.path === '/'
      ? pathname === '/'
      : pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
}

export default function UnifiedHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, glassEnabled, toggleGlass } = useAppearance();
  const { todaysTimes, jummahTimes, currentDate } = usePrayerTimes();
  const prayerDockRef = useRef(null),
    audioRef = useRef(null),
    menuRef = useRef(null),
    quickMenuRef = useRef(null),
    quickMenuButtonRef = useRef(null),
    menuCloseRef = useRef(null),
    subnavRef = useRef(null);
  const [playing, setPlaying] = useState(false),
    [radioLoading, setRadioLoading] = useState(false),
    [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false),
    [donationOpen, setDonationOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [expandedMenuGroups, setExpandedMenuGroups] = useState({});
  const navigation = useMemo(() => activeNavigation(pathname), [pathname]);
  const subtabs = navigation?.children || [];
  const selected = subtabs
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const availability = useRadioAvailability(streamUrl);
  const status = radioError ? 'Retry' : radioLoading ? 'Loading' : playing ? 'Live' : 'Listen';

  useEffect(() => {
    setMenuOpen(false);
    setQuickMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (menuOpen || donationOpen) setQuickMenuOpen(false);
  }, [menuOpen, donationOpen]);
  useEffect(() => {
    if (!quickMenuOpen) return undefined;
    const closeOutside = (event) => {
      if (!quickMenuRef.current?.contains(event.target)) setQuickMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setQuickMenuOpen(false);
      quickMenuButtonRef.current?.focus();
    };
    const desktop = window.matchMedia('(min-width: 768px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setQuickMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [quickMenuOpen]);
  useEffect(() => {
    const openDonation = () => {
      setMenuOpen(false);
      setDonationOpen(true);
    };
    const openMenu = () => setMenuOpen(true);
    window.addEventListener('jic-open-donation', openDonation);
    window.addEventListener('jic-open-menu', openMenu);
    return () => {
      window.removeEventListener('jic-open-donation', openDonation);
      window.removeEventListener('jic-open-menu', openMenu);
    };
  }, []);
  // Measure before paint so larger phone text cannot sit beneath the header.
  useLayoutEffect(() => {
    const node = prayerDockRef.current;
    const update = () =>
      document.documentElement.style.setProperty(
        '--jic-prayer-dock-height',
        `${Math.ceil(node.getBoundingClientRect().height)}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const nav = subnavRef.current;
    if (!nav) return undefined;
    const centreCurrent = () => {
      const current = nav.querySelector('[aria-current="page"]');
      if (!current || nav.scrollWidth <= nav.clientWidth) {
        nav.scrollLeft = 0;
        return;
      }
      const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft = Math.max(
        0,
        nav.scrollLeft + offset - (nav.clientWidth - current.offsetWidth) / 2,
      );
    };
    centreCurrent();
    const observer = new ResizeObserver(centreCurrent);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const node = menuRef.current,
      previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    // React autofocus can run before showModal; explicitly focus the visible close control.
    menuCloseRef.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      clearRadioMediaSession();
    };
  }, []);

  async function toggleRadio() {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    setRadioError(false);
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      setRadioLoading(true);
      await audio.play();
    } catch {
      setPlaying(false);
      setRadioLoading(false);
      setRadioError(true);
    }
  }
  const radioButton = (
    <button
      type="button"
      className="jic-radio-flat"
      data-availability={availability}
      title={`Station ${availability === 'unknown' ? 'status unavailable' : availability}`}
      onClick={toggleRadio}
      disabled={!streamUrl}
      aria-label={`${playing ? 'Pause' : 'Play'} JIC Radio — station ${availability}${radioError ? ' — retry' : ''}`}
      aria-pressed={playing}
    >
      {playing ? <Pause size={17} /> : <Play size={17} />}
      <span>Radio</span>
      <i aria-hidden="true" />
      <small>{status}</small>
    </button>
  );

  return (
    <>
      <audio
        ref={audioRef}
        src={streamUrl || undefined}
        preload="none"
        playsInline
        onPlaying={() => {
          setPlaying(true);
          setRadioLoading(false);
          setRadioError(false);
          updateRadioMediaSession(audioRef.current);
        }}
        onPause={() => {
          setPlaying(false);
          setRadioLoading(false);
          updateRadioMediaSession(audioRef.current);
        }}
        onWaiting={() => setRadioLoading(true)}
        onError={() => {
          setPlaying(false);
          setRadioLoading(false);
          setRadioError(true);
        }}
        aria-hidden="true"
      />
      <header className="jic-unified-header">
        <div ref={prayerDockRef} className="jic-prayer-dock">
          <PrayerTimeBar
            todaysTimes={todaysTimes}
            jummahTimes={jummahTimes}
            currentDate={currentDate}
            radio={
              <div className="jic-header-radio">
                {radioButton}
                <a
                  href="/radio"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open JIC Radio player"
                  title="Open player"
                  onClick={() => audioRef.current?.pause()}
                >
                  <ExternalLink size={15} />
                </a>
              </div>
            }
          />
        </div>
        <div className="jic-unified-inner">
          <div className="jic-free-nav-row">
            <Link to="/" className="jic-free-brand" aria-label="Jamatia Islamic Centre home">
              <JamatiaLogo variant="wordmark" />
            </Link>
            <div className="jic-mobile-quick-nav" ref={quickMenuRef}>
              <button
                ref={quickMenuButtonRef}
                type="button"
                className="jic-menu-word"
                aria-expanded={quickMenuOpen}
                aria-controls="jic-quick-menu"
                onClick={() => setQuickMenuOpen((open) => !open)}
              >
                Menu <ChevronDown size={16} aria-hidden="true" />
              </button>
              {quickMenuOpen && (
                <nav id="jic-quick-menu" className="jic-quick-menu" aria-label="Main pages">
                  {MENU_GROUPS.map(({ name, path }) => (
                    <NavLink
                      key={path}
                      to={path}
                      end={path === '/'}
                      onClick={() => setQuickMenuOpen(false)}
                    >
                      {name}
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>
            <nav className="jic-desktop-primary-nav" aria-label="Primary navigation">
              {NAV_GROUPS.map(({ name, path }) => (
                <div className="jic-desktop-nav-group" key={path}>
                  <NavLink to={path} end={path === '/'}>
                    {name}
                  </NavLink>
                </div>
              ))}
            </nav>
            <div className="jic-free-actions">
              <Link to="/search" aria-label="Search site">
                <Search size={20} />
              </Link>
              <button
                type="button"
                className="jic-theme-action"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
              <Link to="/" aria-label="Home">
                <Home size={20} />
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="jic-menu-trigger"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="jic-site-menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
          {subtabs.length > 0 && (
            <nav
              ref={subnavRef}
              className="jic-unified-subnav"
              aria-label={`${navigation.name} sections`}
            >
              {subtabs.map((item) => (
                <Link
                  key={`${item.path}-${item.name}`}
                  to={item.path}
                  aria-current={item.path === selected ? 'page' : undefined}
                  className={cn('jic-unified-subnav-link', item.path === selected && 'is-current')}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <nav className="jic-mobile-controls" aria-label="Quick navigation">
        <button
          type="button"
          onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
        >
          <ArrowLeft size={21} aria-hidden="true" />
          <span>Back</span>
        </button>
        <button type="button" onClick={() => setDonationOpen(true)}>
          <Heart className="jic-donate-heart" size={21} aria-hidden="true" />
          <span>Donate</span>
        </button>
        <Link to="/search" aria-label="Search site">
          <Search size={21} aria-hidden="true" />
          <span>Search</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun size={21} aria-hidden="true" />
          ) : (
            <Moon size={21} aria-hidden="true" />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button
          type="button"
          className="jic-bottom-menu-trigger"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="jic-site-menu"
          aria-haspopup="dialog"
        >
          <Menu size={22} aria-hidden="true" />
          <span>Menu</span>
        </button>
      </nav>
      {radioError && (
        <span className="sr-only" role="status">
          Radio could not start. Press Radio to retry.
        </span>
      )}
      {menuOpen && (
        <dialog
          id="jic-site-menu"
          ref={menuRef}
          className="jic-unified-menu"
          aria-label="Navigation menu"
          onCancel={() => setMenuOpen(false)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              setMenuOpen(false);
          }}
        >
          <div className="jic-unified-menu-head">
            <strong>Menu</strong>
            <button
              ref={menuCloseRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={24} />
            </button>
          </div>
          <div className="jic-unified-menu-scroll">
            <nav className="jic-menu-directory" aria-label="All pages">
              <ul className="jic-menu-list">
                {MENU_GROUPS.map(({ name, path, children }) => {
                  const subpages = children.filter((child) => child.path !== path);
                  const expanded = Boolean(expandedMenuGroups[path]);
                  const childrenId = `jic-menu-${path.slice(1) || 'home'}-children`;
                  return (
                    <li className="jic-unified-menu-group" key={path}>
                      <div className="jic-unified-menu-row">
                        <NavLink to={path} end onClick={() => setMenuOpen(false)}>
                          {name}
                        </NavLink>
                        {subpages.length > 0 && (
                          <button
                            type="button"
                            className="jic-menu-expand"
                            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name} subpages`}
                            aria-expanded={expanded}
                            aria-controls={childrenId}
                            onClick={() =>
                              setExpandedMenuGroups((previous) => ({
                                ...previous,
                                [path]: !previous[path],
                              }))
                            }
                          >
                            <ChevronDown size={20} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      {subpages.length > 0 && (
                        <ul
                          id={childrenId}
                          className="jic-unified-menu-children"
                          hidden={!expanded}
                        >
                          {subpages.map((child) => (
                            <li key={`${child.path}-${child.name}`}>
                              <NavLink end to={child.path} onClick={() => setMenuOpen(false)}>
                                {child.name}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="jic-menu-appearance">
              <button type="button" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}{' '}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
              <button type="button" onClick={toggleGlass} aria-pressed={glassEnabled}>
                <Sparkles size={17} /> Glass {glassEnabled ? 'on' : 'off'}
              </button>
            </div>
            <div className="jic-menu-bottom-actions">
              <Link
                to="/admin/login"
                className="jic-unified-admin-link"
                onClick={() => setMenuOpen(false)}
              >
                <LogIn size={17} />
                Admin login
              </Link>
              <button
                type="button"
                className="jic-unified-menu-donate"
                onClick={() => {
                  setMenuOpen(false);
                  setDonationOpen(true);
                }}
              >
                <Heart className="jic-donate-heart" size={18} aria-hidden="true" />
                Donate
              </button>
            </div>
          </div>
        </dialog>
      )}
      <WonderfulDonationModal open={donationOpen} onClose={() => setDonationOpen(false)} />
    </>
  );
}
