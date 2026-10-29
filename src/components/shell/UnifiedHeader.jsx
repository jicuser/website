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
import { ChevronDown, ChevronRight, Pause, Play, ExternalLink } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AppInstall from '@/components/shell/AppInstall';
import InstalledAppBar from '@/components/shell/InstalledAppBar';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { HeaderActions, NavigationDrawer } from '@/components/shell/SiteNavigation';
import { drawerNavigation } from '@/lib/drawerNavigation';
import { PUBLIC_MENU_GROUPS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { useProgrammeJourney } from '@/context/ProgrammeJourneyContext';
import { usePublishedPages } from '@/context/PublishedPagesContext';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import MobileInfoBanner from '@/components/shell/MobileInfoBanner';
import { cn } from '@/lib/utils';
import {
  activeNavigation,
  navigationBreadcrumbs,
  compactMenuNavigation,
} from '@/lib/publicNavigation';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { usePrayerDockVisibility } from '@/hooks/usePrayerDockVisibility';
import { prefersQuietPrayerDock } from '@/lib/publicTaskRoute';
import { nextCongregation } from '@/lib/nextCongregation';
import TodayPrayerSummary from '@/components/home/TodayPrayerSummary';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

const DonationDialog = lazy(() => import('@/components/donations/DonationDialog'));
const RadioLiveNotice = lazy(() => import('./RadioLiveNotice'));
const DesktopNavigation = lazy(() => import('./DesktopNavigation'));

export default function UnifiedHeader() {
  const { getContent } = useContent();
  const { user } = useAuth();
  const accountLabel = user ? 'My portal' : 'Portal login';
  const addedPages = usePublishedPages();
  const menuGroups = visibleNavigation(PUBLIC_MENU_GROUPS, getContent, addedPages);
  const directoryGroups = compactMenuNavigation(menuGroups);
  const drawerGroups = drawerNavigation(directoryGroups, menuGroups);
  const { pathname: routePath, key: routeKey } = useLocation();
  const pathname = routePath.replace(/\/+$/, '') || '/';
  const isHome = pathname === '/';
  const taskRoute = prefersQuietPrayerDock(pathname);
  const { todaysTimes, jummahTimes, currentDate } = usePublicPrayerTimes();
  const prayerDockRef = useRef(null),
    mobileBannerRef = useRef(null),
    audioRef = useRef(null),
    subnavRef = useRef(null);
  const [playing, setPlaying] = useState(false),
    [radioLoading, setRadioLoading] = useState(false),
    [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false),
    [menuView, setMenuView] = useState('navigation'),
    [donationOpen, setDonationOpen] = useState(false);
  const { hidden: prayerDockHidden, toggle: togglePrayerDock } = usePrayerDockVisibility(
    isHome ? mobileBannerRef : prayerDockRef,
    routeKey,
    menuOpen || donationOpen,
    taskRoute,
  );
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 1200px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1200px)');
    const update = () => setDesktop(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const programme = useProgrammeJourney();
  const originalNavigation = useMemo(
    () => activeNavigation(programme?.placement || pathname),
    [programme?.placement, pathname],
  );
  const movedSection = menuGroups.find(
    (group) => group.path === getContent(pageSectionKey(pathname), ''),
  );
  const configuredSection =
    movedSection || menuGroups.find((group) => group.path === originalNavigation?.path);
  const configuredPrimary = menuGroups.find(
    (group) => group.path === originalNavigation?.primaryPath,
  );
  const navigation = configuredSection
    ? {
        ...originalNavigation,
        ...configuredSection,
        primaryPath:
          movedSection?.path || originalNavigation?.primaryPath || configuredSection.path,
        primaryName: movedSection?.name || configuredPrimary?.name || configuredSection.name,
        current:
          configuredSection.children.find((page) => page.path === pathname) ||
          configuredSection.children.find(
            (page) => page.path === originalNavigation?.current?.path,
          ),
      }
    : originalNavigation;
  const subtabs = (pathname === '/about' ? [] : navigation?.children || []).filter((page) =>
    isPageVisible(getContent, page.path),
  );
  const selected = navigation?.current?.path;
  const breadcrumbs = navigationBreadcrumbs(navigation);
  const hasSectionPicker = subtabs.length > 0;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const availability = useRadioAvailability(streamUrl);
  const status = radioError
    ? 'Retry'
    : radioLoading
      ? 'Loading'
      : playing
        ? 'Playing'
        : availability === 'offline'
          ? 'Off air'
          : 'Listen';
  const next = nextCongregation(todaysTimes, jummahTimes, currentDate);
  // Close before destination controls receive focus, but keep the menu during pending routes.
  useLayoutEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
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
    const banner = mobileBannerRef.current;
    const update = () => {
      const style = document.documentElement.style;
      style.setProperty(
        '--jic-prayer-dock-height',
        `${Math.ceil(prayer?.getBoundingClientRect().height || 0)}px`,
      );
      style.setProperty(
        '--jic-mobile-strip-height',
        `${Math.ceil(banner?.getBoundingClientRect().height || 0)}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (prayer) observer.observe(prayer);
    if (banner) observer.observe(banner);
    return () => observer.disconnect();
  }, [isHome]);
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
      <AppInstall />
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
      <header className={cn('jic-unified-header jic-header-redesign', taskRoute && 'is-task-mode')}>
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
            <Link
              to="/"
              className="jic-free-brand"
              aria-label="Jamatia Islamic Centre home"
              onClick={() => { if (isHome) window.scrollTo({ top: 0, behavior: 'auto' }); }}
            >
              <JamatiaLogo variant="wordmark" />
            </Link>
            {desktop && (
              <Suspense fallback={null}>
                <DesktopNavigation navigation={navigation} groups={directoryGroups} />
              </Suspense>
            )}
            <HeaderActions
              open={menuOpen}
              view={menuView}
              onOpen={(view) => { setMenuView(view); setMenuOpen(true); }}
            />
          </div>
          {breadcrumbs.length > 0 && (
            <nav
              className={cn('jic-section-location', hasSectionPicker && 'has-section-picker')}
              aria-label="Current section"
            >
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
          {hasSectionPicker && (
            <details key={pathname} className="jic-section-picker">
              <summary>
                <span>
                  <small>
                    {breadcrumbs
                      .slice(0, -1)
                      .map((item) => item.name)
                      .join(' / ') || navigation.name}
                  </small>
                  <strong>
                    {programme
                      ? `${programme.title}${pathname.startsWith('/forms/') ? ' · Form' : ''}`
                      : navigation.current?.name || `Browse ${navigation.name}`}
                  </strong>
                </span>
                <span className="jic-section-view-all">View all <ChevronDown size={16} aria-hidden="true" /></span>
              </summary>
              <nav aria-label={`${navigation.name} pages`}>
                {breadcrumbs
                  .filter((item) => !subtabs.some((tab) => tab.path === item.path))
                  .map((item) => (
                    <Link key={item.path} to={item.path}>
                      {item.name}
                    </Link>
                  ))}
                {subtabs.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={
                      item.path === selected
                        ? programme || pathname !== item.path
                          ? 'location'
                          : 'page'
                        : undefined
                    }
                  >
                    {item.name}
                  </Link>
                ))}
                {programme && (
                  <Link
                    to={programme.to}
                    aria-current={pathname === programme.to ? 'page' : undefined}
                  >
                    {programme.title}
                  </Link>
                )}
              </nav>
            </details>
          )}
          {hasSectionPicker && (
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
          {taskRoute && (
            <button
              type="button"
              className="jic-task-prayer-toggle"
              onClick={togglePrayerDock}
              aria-controls="jic-prayer-dock"
              aria-expanded={!prayerDockHidden}
            >
              {prayerDockHidden ? 'Show prayer times' : 'Hide prayer times'}
            </button>
          )}
        </div>
      </header>
      {!isHome && (
        <div className="jic-mobile-dock">
          <div
            id="jic-prayer-dock"
            ref={prayerDockRef}
            className={cn('jic-prayer-dock', prayerDockHidden && 'is-scroll-hidden')}
            aria-hidden={prayerDockHidden || undefined}
            inert={prayerDockHidden ? '' : undefined}
          >
            <div className="jic-mobile-prayer-summary">
              <TodayPrayerSummary />
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
        </div>
      )}
      {radioError && (
        <span className="sr-only" role="status">
          Radio could not start. Press Radio to retry.
        </span>
      )}
      {availability === 'online' && (
        <Suspense fallback={null}>
          <RadioLiveNotice
            streamUrl={streamUrl}
            availability={availability}
            playing={playing}
            busy={radioLoading}
            hidden={menuOpen || donationOpen || taskRoute}
            onListen={toggleRadio}
          />
        </Suspense>
      )}
      <InstalledAppBar open={menuOpen} view={menuView} onOpen={(view) => { setMenuView(view); setMenuOpen(true); }} />
      <NavigationDrawer
        open={menuOpen}
        view={menuView}
        groups={drawerGroups}
        pathname={pathname}
        accountLabel={accountLabel}
        onClose={() => setMenuOpen(false)}
        onViewChange={setMenuView}
        onDonate={() => { setMenuOpen(false); setDonationOpen(true); }}
      />
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
