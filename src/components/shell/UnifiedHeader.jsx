import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Home, LogIn, MapPin, Menu, Moon, Pause, Phone, Play, Sparkles, Sun, X, ExternalLink } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { MADRASSAH_TABS, MASJID_EXTENSION_TABS, NAV_GROUPS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { useAppearance } from '@/context/AppearanceContext';
import { nextPrayer } from '@/lib/nextPrayer';
import { cn } from '@/lib/utils';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

const PRAYERS = [['Fajr','fajr','jamaah_fajr'],['Sunrise','sunrise',null],['Dhuhr','dhuhr','jamaah_dhuhr'],['Asr','asr','jamaah_asr'],['Maghrib','maghrib','jamaah_maghrib'],['Isha','isha','jamaah_isha']];
const shortTime = value => value && value !== 'N/A' ? String(value).replace(/^0/, '').replace(/\s?[AP]M$/i, '') : '—';

function activeNavigation(pathname) {
  if (pathname === '/madrassah' || pathname.startsWith('/madrassah/')) return { name: 'Madrassah', children: MADRASSAH_TABS };
  if (pathname === '/projects/masjid-extension' || MASJID_EXTENSION_TABS.slice(1).some(item => item.path === pathname)) return { name: 'Masjid Extension', children: MASJID_EXTENSION_TABS };
  if (['/team','/contact','/financial-history'].includes(pathname)) return NAV_GROUPS.find(item => item.name === 'About');
  if (pathname.startsWith('/funerals')) return NAV_GROUPS.find(item => item.name === 'Services');
  return NAV_GROUPS.find(item => item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`));
}

export default function UnifiedHeader() {
  const { pathname } = useLocation();
  const { theme, toggleTheme, glassEnabled, toggleGlass } = useAppearance();
  const { todaysTimes, jummahTimes, currentDate } = usePrayerTimes();
  const headerRef = useRef(null), audioRef = useRef(null), menuRef = useRef(null), menuCloseRef = useRef(null), subnavRef = useRef(null);
  const [playing, setPlaying] = useState(false), [radioLoading, setRadioLoading] = useState(false), [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false), [donationOpen, setDonationOpen] = useState(false);
  const next = nextPrayer(todaysTimes, currentDate);
  const navigation = useMemo(() => activeNavigation(pathname), [pathname]);
  const subtabs = navigation?.children || [];
  const selected = subtabs.filter(item => pathname === item.path || pathname.startsWith(`${item.path}/`)).sort((a,b) => b.path.length - a.path.length)[0]?.path;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const availability = useRadioAvailability(streamUrl);
  const status = radioError ? 'Retry' : radioLoading ? 'Loading' : playing ? 'Live' : 'Listen';

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const openDonation = () => { setMenuOpen(false); setDonationOpen(true); };
    const openMenu = () => setMenuOpen(true);
    window.addEventListener('jic-open-donation', openDonation);
    window.addEventListener('jic-open-menu', openMenu);
    return () => {
      window.removeEventListener('jic-open-donation', openDonation);
      window.removeEventListener('jic-open-menu', openMenu);
    };
  }, []);
  useEffect(() => {
    const node = headerRef.current;
    const update = () => document.documentElement.style.setProperty('--jic-header-height', `${Math.ceil(node.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const nav = subnavRef.current;
    if (!nav) return undefined;
    const centreCurrent = () => {
      const current = nav.querySelector('[aria-current="page"]');
      if (!current || nav.scrollWidth <= nav.clientWidth) { nav.scrollLeft = 0; return; }
      const offset = current.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft = Math.max(0, nav.scrollLeft + offset - (nav.clientWidth - current.offsetWidth) / 2);
    };
    centreCurrent();
    const observer = new ResizeObserver(centreCurrent);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const node = menuRef.current, old = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = 'hidden';
    // React autofocus can run before showModal; explicitly focus the visible close control.
    menuCloseRef.current?.focus({ preventScroll:true });
    return () => { node.close(); document.body.style.overflow = old; };
  }, [menuOpen]);
  useEffect(() => { const audio = audioRef.current; return () => { audio?.pause(); clearRadioMediaSession(); }; }, []);

  async function toggleRadio() {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    setRadioError(false);
    if (!audio.paused) { audio.pause(); return; }
    try { setRadioLoading(true); await audio.play(); }
    catch { setPlaying(false); setRadioLoading(false); setRadioError(true); }
  }
  const radioButton = <button type="button" className="jic-radio-flat" data-availability={availability} title={`Station ${availability === 'unknown' ? 'status unavailable' : availability}`} onClick={toggleRadio} disabled={!streamUrl} aria-label={`${playing ? 'Pause' : 'Play'} JIC Radio — station ${availability}${radioError ? ' — retry' : ''}`} aria-pressed={playing}>
    {playing ? <Pause size={17}/> : <Play size={17}/>}<span>Radio</span><i aria-hidden="true"/><small>{status}</small>
  </button>;

  return <>
    <audio ref={audioRef} src={streamUrl || undefined} preload="none" playsInline onPlaying={() => { setPlaying(true); setRadioLoading(false); setRadioError(false); updateRadioMediaSession(audioRef.current); }} onPause={() => { setPlaying(false); setRadioLoading(false); updateRadioMediaSession(audioRef.current); }} onWaiting={() => setRadioLoading(true)} onError={() => { setPlaying(false); setRadioLoading(false); setRadioError(true); }} aria-hidden="true"/>
    <header ref={headerRef} className="jic-unified-header fixed inset-x-0 top-0 z-50"><div className="jic-unified-inner">
      <div className="jic-unified-info jic-glass">
        <div className="jic-header-context"><Link to="/contact#map"><MapPin size={14}/><span>{SITE.address.short}</span></Link><a href={`tel:${SITE.phone.replace(/\s/g,'')}`}><Phone size={14}/>{SITE.phone}</a></div>
        <div className="jic-prayer-legend"><Link to="/prayer-times">{next ? <><strong>Next: {next.name}</strong><span>Start {shortTime(next.time)} · Jama’ah {shortTime(next.jamaah)}</span></> : 'Prayer timetable'} <span aria-hidden="true">›</span></Link>{next && <span className="jic-prayer-countdown">{Math.floor(next.minutesLeft / 60) > 0 ? `${Math.floor(next.minutesLeft / 60)}h ` : ''}{next.minutesLeft % 60}m until {next.name} starts</span>}</div>
        <div className="jic-today-prayer-row" aria-label="Today’s prayer times">{PRAYERS.map(([label,key,jamaah]) => <Link key={key} to="/prayer-times" className={cn('jic-today-prayer', next?.name === label && 'is-next')} aria-label={`${label}: begins ${shortTime(todaysTimes?.[key])}${jamaah ? `, Jama‘ah ${shortTime(todaysTimes?.[jamaah])}` : ''}`}>
          <span>{label}</span><div><strong><small>Start</small>{shortTime(todaysTimes?.[key])}</strong><em><small>{jamaah ? 'Jama’ah' : '—'}</small>{jamaah ? shortTime(todaysTimes?.[jamaah]) : '—'}</em></div>
        </Link>)}</div>
        <div className="jic-header-live-row">{[0,1].map(index => <Link key={index} to="/prayer-times/jummah" className="jic-jummah-compact"><b>Jummah {index + 1}</b><span>{shortTime(jummahTimes?.[index]?.prayer)}</span></Link>)}<div className="jic-header-radio">{radioButton}<a href="/radio" target="_blank" rel="noopener noreferrer" aria-label="Open JIC Radio player" title="Open player" onClick={() => audioRef.current?.pause()}><ExternalLink size={15}/></a></div></div>
      </div>
      <div className="jic-free-nav-row"><Link to="/" className="jic-free-brand" aria-label="Jamatia Islamic Centre home"><JamatiaLogo variant="horizontal"/></Link>
        <nav className="jic-desktop-primary-nav" aria-label="Primary navigation">{NAV_GROUPS.map(({name,path}) => <div className="jic-desktop-nav-group" key={path}><NavLink to={path} end={path === '/'}>{name}</NavLink></div>)}</nav>
        <div className="jic-free-actions"><button type="button" className="jic-quick-theme" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button><Link to="/" className="jic-home-action" aria-label="Home"><Home size={20}/></Link><button type="button" onClick={() => setMenuOpen(true)} aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="jic-site-menu"><Menu size={22}/></button></div>
      </div>
      {subtabs.length > 0 && <nav ref={subnavRef} className="jic-unified-subnav" aria-label={`${navigation.name} sections`}>{subtabs.map(item => <Link key={`${item.path}-${item.name}`} to={item.path} aria-current={item.path === selected ? 'page' : undefined} className={cn('jic-unified-subnav-link', item.path === selected && 'is-current')}>{item.name}</Link>)}</nav>}
    </div></header>
    {radioError && <span className="sr-only" role="status">Radio could not start. Press Radio to retry.</span>}
    {menuOpen && <dialog id="jic-site-menu" ref={menuRef} className="jic-unified-menu" aria-label="Navigation menu" onCancel={() => setMenuOpen(false)}>
      <div className="jic-unified-menu-head"><Link to="/" onClick={() => setMenuOpen(false)}><JamatiaLogo/></Link><button ref={menuCloseRef} type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation menu"><X size={24}/></button></div>
      <div className="jic-unified-menu-scroll"><div className="jic-menu-appearance"><button type="button" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>} {theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><button type="button" onClick={toggleGlass} aria-pressed={glassEnabled}><Sparkles size={17}/> Glass {glassEnabled ? 'on' : 'off'}</button></div>
        <nav className="jic-menu-directory" aria-label="All pages">
          {[...NAV_GROUPS, {name:'Madrassah',path:'/madrassah',children:MADRASSAH_TABS}].map(({name,path,children}) => <div className="jic-unified-menu-group" key={path}><div className="jic-unified-menu-row"><NavLink to={path} end onClick={() => setMenuOpen(false)}>{name}</NavLink></div>{children.length > 0 && <div className="jic-unified-menu-children">{children.filter(child => child.path !== path).map(child => <NavLink end key={`${child.path}-${child.name}`} to={child.path} onClick={() => setMenuOpen(false)}>{child.name}</NavLink>)}</div>}</div>)}
        </nav>
        <Link to="/admin/login" className="jic-unified-admin-link" onClick={() => setMenuOpen(false)}><LogIn size={17}/>Admin login</Link><button type="button" className="jic-unified-menu-donate" onClick={() => { setMenuOpen(false); setDonationOpen(true); }}><Heart size={18}/>Donate</button>
      </div>
    </dialog>}
    <WonderfulDonationModal open={donationOpen} onClose={() => setDonationOpen(false)}/>
  </>;
}
