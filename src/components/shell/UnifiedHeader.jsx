import { useContent } from '@/context/ContentContext';
import { useAuth } from '@/context/AuthContext';
import { isPageVisible, visibleNavigation, pageSectionKey } from '@/lib/pageVisibility';
import React, {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Heart,
  Home,
  LogIn,
  User,
  Menu,
  Pause,
  Play,
  X,
  ExternalLink,
  Search,
  Clock3,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { useNavigationHistory } from '@/context/NavigationContext';
import { useProgrammeJourney } from '@/context/ProgrammeJourneyContext';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import DesktopNavigation from '@/components/shell/DesktopNavigation';
import MobileInfoBanner from '@/components/shell/MobileInfoBanner';
import { cn } from '@/lib/utils';
import {
  activeNavigation,
  navigationBreadcrumbs,
  compactMenuNavigation,
} from '@/lib/publicNavigation';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { usePrayerDockVisibility } from '@/hooks/usePrayerDockVisibility';
import { nextCongregation } from '@/lib/nextCongregation';
import { displayTime } from '@/lib/timetable';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

const DonationDialog = lazy(() => import('@/components/donations/DonationDialog'));

// One compact time per obligatory congregation. Full start and jama'ah times
// remain available when visitors expand the dock.
const compactJamaahTime = (value) => {
  const formatted = displayTime(value);
  return formatted === '—' ? '—' : formatted.replace(/\s+/g, '').toLowerCase();
};

export default function UnifiedHeader() {
  const { getContent } = useContent();
  const { user } = useAuth();
  const accountLabel = user ? 'My portal' : 'Portal login';
  const menuGroups = visibleNavigation(PUBLIC_MENU_GROUPS, getContent);
  const directoryGroups = compactMenuNavigation(menuGroups);
  const { pathname, key: routeKey } = useLocation();
  const alertSetup = pathname === '/prayer-times/reminders';
  const navigate = useNavigate();
  const { canGoBack, previousPath } = useNavigationHistory();
  const showHome = pathname === '/' || !canGoBack || previousPath === '/';
  const { todaysTimes, jummahTimes, currentDate, isLoadingPrayerTimes } = usePublicPrayerTimes();
  const prayerDockRef = useRef(null),
    mobileBannerRef = useRef(null),
    mobileControlsRef = useRef(null),
    audioRef = useRef(null),
    menuRef = useRef(null),
    quickMenuRef = useRef(null),
    quickMenuButtonRef = useRef(null),
    prayerToggleRef = useRef(null),
    menuCloseRef = useRef(null),
    subnavRef = useRef(null);
  const [playing, setPlaying] = useState(false),
    [radioLoading, setRadioLoading] = useState(false),
    [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false),
    [donationOpen, setDonationOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [prayerExpanded, setPrayerExpanded] = useState(false);
  const { hidden: prayerDockHidden, toggle: togglePrayerDock } = usePrayerDockVisibility(
    prayerDockRef,
    routeKey,
    menuOpen || donationOpen || quickMenuOpen,
    alertSetup,
  );
  const [expandedMenuGroups, setExpandedMenuGroups] = useState({});
  const programme = useProgrammeJourney();
  const originalNavigation = useMemo(
    () => activeNavigation(programme?.placement || pathname),
    [programme?.placement, pathname],
  );
  const movedSection = menuGroups.find(
    (group) => group.path === getContent(pageSectionKey(pathname), ''),
  );
  const navigation = movedSection
    ? {
        ...movedSection,
        primaryPath: movedSection.path,
        primaryName: movedSection.name,
        current: movedSection.children.find((page) => page.path === pathname),
      }
    : originalNavigation;
  const subtabs = (navigation?.children || []).filter((page) =>
    isPageVisible(getContent, page.path),
  );
  const selected = navigation?.current?.path;
  const breadcrumbs = navigationBreadcrumbs(navigation);
  const menuSection =
    pathname === '/social-media'
      ? pathname
      : navigation?.path === '/madrassah'
        ? navigation.path
        : navigation?.primaryPath;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const availability = useRadioAvailability(streamUrl);
  const status = radioError ? 'Retry' : radioLoading ? 'Loading' : playing ? 'Live' : 'Listen';
  const next = nextCongregation(todaysTimes, jummahTimes, currentDate);
  const isFriday =
    currentDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' }) ===
    'Fri';
  const todayCongregations = [
    { name: 'Fajr', time: todaysTimes?.jamaah_fajr },
    {
      name: isFriday ? 'Jummah' : 'Dhuhr',
      time: isFriday ? jummahTimes?.[0]?.prayer : todaysTimes?.jamaah_dhuhr,
    },
    { name: 'Asr', time: todaysTimes?.jamaah_asr },
    { name: 'Maghrib', time: todaysTimes?.jamaah_maghrib },
    { name: 'Isha', time: todaysTimes?.jamaah_isha },
  ];
  const accessibleJamaahTimes = todaysTimes
    ? todayCongregations.map(({ name, time }) => `${name} ${displayTime(time)}`).join(', ')
    : isLoadingPrayerTimes
      ? 'Loading times'
      : 'Times unavailable';

  const toggleTimetable = () => {
    if (prayerDockHidden) {
      togglePrayerDock();
      setPrayerExpanded(true);
    } else setPrayerExpanded((expanded) => !expanded);
  };

  useEffect(() => {
    if (prayerDockHidden) setPrayerExpanded(false);
  }, [prayerDockHidden]);
  useEffect(() => {
    if (!prayerExpanded) return undefined;
    const close = (event) => {
      if (event.key !== 'Escape') return;
      setPrayerExpanded(false);
      prayerToggleRef.current?.focus();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [prayerExpanded]);

  // Close when navigation commits, so a slow page cannot expose the old screen.
  useLayoutEffect(() => {
    setMenuOpen(false);
    setQuickMenuOpen(false);
    setPrayerExpanded(false);
  }, [pathname]);
  useEffect(() => {
    if (menuOpen || donationOpen) setQuickMenuOpen(false);
    if (menuOpen || donationOpen || quickMenuOpen) setPrayerExpanded(false);
  }, [menuOpen, donationOpen, quickMenuOpen]);
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
    window.addEventListener('jic-open-donation', openDonation);
    return () => {
      window.removeEventListener('jic-open-donation', openDonation);
    };
  }, []);
  // Shared measurements keep content, floating actions and phone safe areas clear.
  useLayoutEffect(() => {
    const prayer = prayerDockRef.current;
    const controls = mobileControlsRef.current;
    const banner = mobileBannerRef.current;
    const update = () => {
      const style = document.documentElement.style;
      style.setProperty(
        '--jic-prayer-dock-height',
        `${Math.ceil(prayer.getBoundingClientRect().height)}px`,
      );
      style.setProperty(
        '--jic-mobile-strip-height',
        `${Math.ceil(banner.getBoundingClientRect().height)}px`,
      );
      style.setProperty(
        '--jic-mobile-controls-height',
        `${Math.ceil(controls.getBoundingClientRect().height)}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(prayer);
    observer.observe(controls);
    observer.observe(banner);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const nav = subnavRef.current;
    if (!nav) return undefined;
    const centreCurrent = () => {
      const current = nav.querySelector('[aria-current]');
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
  }, [pathname, selected]);
  useLayoutEffect(() => {
    if (!menuOpen) return undefined;
    const node = menuRef.current,
      previousOverflow = document.body.style.overflow;
    node.showModal();
    setExpandedMenuGroups({});
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
      <header className={cn('jic-unified-header', alertSetup && 'is-task-mode')}>
        <MobileInfoBanner
          ref={mobileBannerRef}
          collapsed={prayerDockHidden}
          next={next}
          jummahTimes={jummahTimes}
          notices={getContent('header_ticker_items', '[]')}
          radio={radioButton}
        />
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
                  {[
                    ...directoryGroups,
                    { name: 'Donate', path: '/donate' },
                    { name: accountLabel, path: '/portal' },
                  ].map(({ name, path }) => (
                    <Link
                      key={path}
                      to={path}
                      aria-current={
                        path === menuSection ? (pathname === path ? 'page' : 'location') : undefined
                      }
                      onClick={() => {
                        if (pathname === path) setQuickMenuOpen(false);
                      }}
                    >
                      {name}
                    </Link>
                  ))}
                </nav>
              )}
            </div>
            <DesktopNavigation navigation={navigation} groups={directoryGroups} />
            <div className="jic-free-actions-slot">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="jic-menu-trigger jic-desktop-action"
                aria-haspopup="dialog"
                aria-label="Open navigation menu"
                aria-expanded={menuOpen}
                aria-controls="jic-site-menu"
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
          {breadcrumbs.length > 0 && (
            <nav className="jic-section-location" aria-label="Current section">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.path}>
                  {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
                  {!programme &&
                  item.path === navigation.current?.path &&
                  item.path !== navigation.path ? (
                    <span aria-current="page">{item.name}</span>
                  ) : (
                    <Link to={item.path} aria-current={pathname === item.path ? 'page' : undefined}>
                      {item.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
              {programme && (
                <>
                  <ChevronRight size={14} aria-hidden="true" />
                  <Link
                    to={programme.to}
                    aria-current={pathname === programme.to ? 'page' : undefined}
                  >
                    {programme.title}
                  </Link>
                  {pathname.startsWith('/forms/') && (
                    <>
                      <ChevronRight size={14} aria-hidden="true" />
                      <span aria-current="page">Form</span>
                    </>
                  )}
                </>
              )}
            </nav>
          )}
          {subtabs.length > 0 && !alertSetup && pathname !== '/get-involved' && (
            <nav
              ref={subnavRef}
              className="jic-unified-subnav"
              aria-label={`${navigation.name} sections`}
            >
              {subtabs.map((item) => (
                <Link
                  key={`${item.path}-${item.name}`}
                  to={item.path}
                  aria-current={
                    item.path === selected
                      ? pathname === item.path
                        ? 'page'
                        : 'location'
                      : undefined
                  }
                  className={cn('jic-unified-subnav-link', item.path === selected && 'is-current')}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <div ref={mobileControlsRef} className="jic-mobile-dock">
        <div
          id="jic-prayer-dock"
          ref={prayerDockRef}
          className={cn(
            'jic-prayer-dock',
            prayerDockHidden && 'is-scroll-hidden',
            prayerExpanded && 'is-expanded',
          )}
          aria-hidden={prayerDockHidden || undefined}
          inert={prayerDockHidden ? '' : undefined}
        >
          <div className="jic-mobile-prayer-summary">
            <button
              type="button"
              onClick={toggleTimetable}
              className="jic-mobile-prayer-toggle"
              aria-label={
                prayerExpanded
                  ? 'Close full prayer timetable'
                  : `Show full prayer timetable. Today's jama'ah times: ${accessibleJamaahTimes}`
              }
              aria-expanded={prayerExpanded}
              aria-controls="jic-prayer-details"
            >
              <Clock3 size={18} aria-hidden="true" />
              <span className="jic-mobile-prayer-toggle-content">
                <span className="jic-mobile-prayer-heading">
                  {prayerExpanded ? 'Close timetable' : <>Today’s jama’ah times</>}
                </span>
                {!prayerExpanded &&
                  (todaysTimes ? (
                    <span className="jic-mobile-prayer-times">
                      {todayCongregations.map(({ name, time }) => (
                        <span
                          key={name}
                          className={cn(
                            'jic-mini-prayer',
                            (next?.name === name ||
                              (name === 'Jummah' && next?.name === 'Jummah 1')) &&
                              'is-next',
                          )}
                        >
                          <span className="jic-mini-prayer-name">{name}</span>
                          <strong className="jic-mini-prayer-time">
                            {compactJamaahTime(time)}
                          </strong>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="jic-mobile-prayer-empty" role="status">
                      {isLoadingPrayerTimes
                        ? 'Loading today’s times…'
                        : 'Today’s timetable is unavailable'}
                    </span>
                  ))}
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          </div>
          <div id="jic-prayer-details" className="jic-prayer-details">
            <PrayerTimeBar
              todaysTimes={todaysTimes}
              jummahTimes={jummahTimes}
              currentDate={currentDate}
              showContact={false}
              highlightNext
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
        </div>
        <nav className="jic-mobile-controls" aria-label="Quick navigation">
          <button
            type="button"
            onClick={() => {
              if (pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
              else if (canGoBack) navigate(-1);
              else navigate('/');
            }}
          >
            {showHome ? (
              <Home size={21} aria-hidden="true" />
            ) : (
              <ArrowLeft size={21} aria-hidden="true" />
            )}
            <span>{showHome ? 'Home' : 'Back'}</span>
          </button>
          <button type="button" onClick={() => setDonationOpen(true)}>
            <Heart className="jic-donate-heart" size={21} aria-hidden="true" />
            <span>Donate</span>
          </button>
          <button
            ref={prayerToggleRef}
            type="button"
            onClick={toggleTimetable}
            aria-expanded={prayerExpanded && !prayerDockHidden}
            aria-controls="jic-prayer-details"
          >
            <Clock3 size={21} aria-hidden="true" />
            <span>Prayer times</span>
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
      </div>
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
            <Link to="/portal" className="jic-menu-account">
              <User size={22} aria-hidden="true" />
              <span>
                <strong>{accountLabel}</strong>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/search" className="jic-menu-search">
              <Search size={18} /> Search the website
            </Link>
            <nav className="jic-menu-directory" aria-label="All pages">
              <ul className="jic-menu-list">
                {directoryGroups.map(({ name, path, children }) => {
                  const subpages = children.filter((child) => child.path !== path);
                  const expanded = Boolean(expandedMenuGroups[path]);
                  const childrenId = `jic-menu-${path.slice(1) || 'home'}-children`;
                  return (
                    <li className="jic-unified-menu-group" key={path}>
                      <div className="jic-unified-menu-row">
                        <Link
                          to={path}
                          aria-current={
                            path === menuSection ||
                            children.some((child) => child.path === menuSection)
                              ? pathname === path
                                ? 'page'
                                : 'location'
                              : undefined
                          }
                          onClick={() => {
                            if (pathname === path) setMenuOpen(false);
                          }}
                        >
                          {name}
                        </Link>
                        {subpages.length > 0 && (
                          <button
                            type="button"
                            className="jic-menu-expand"
                            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name} subpages`}
                            aria-expanded={expanded}
                            aria-controls={childrenId}
                            onClick={() =>
                              setExpandedMenuGroups((previous) => ({
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
                              <NavLink
                                end
                                to={child.path}
                                onClick={() => {
                                  if (pathname === child.path) setMenuOpen(false);
                                }}
                              >
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
            <div className="jic-menu-bottom-actions">
              <Link to="/admin/login" className="jic-unified-admin-link">
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
      {donationOpen && (
        <Suspense
          fallback={
            <div className="jic-donation-loading" role="status">
              Loading donation details…{' '}
              <button type="button" onClick={() => setDonationOpen(false)}>
                Cancel
              </button>
            </div>
          }
        >
          <DonationDialog open onClose={() => setDonationOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
