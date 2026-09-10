import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, MapPin, Menu, Moon, Pause, Play, Phone, Sun, X, LogIn } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { NAV_GROUPS, MASJID_EXTENSION_TABS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { nextPrayer } from '@/lib/nextPrayer';
import { cn } from '@/lib/utils';

const PRAYERS = [
  ['Fajr', 'fajr', 'jamaah_fajr'],
  ['Sunrise', 'sunrise', null],
  ['Dhuhr', 'dhuhr', 'jamaah_dhuhr'],
  ['Asr', 'asr', 'jamaah_asr'],
  ['Maghrib', 'maghrib', 'jamaah_maghrib'],
  ['Isha', 'isha', 'jamaah_isha'],
];

const JAMAAH_KEYS = {
  Fajr: 'jamaah_fajr',
  Dhuhr: 'jamaah_dhuhr',
  Asr: 'jamaah_asr',
  Maghrib: 'jamaah_maghrib',
  Isha: 'jamaah_isha',
};

const EXTENSION_PATHS = [
  '/projects/masjid-extension', '/projects/main-prayer-hall', '/projects/wudu-area',
  '/projects/community-hall', '/projects/madrassah-floor', '/projects/madrassah-building', '/projects/timeline',
];

const REMINDERS = [
  { type: 'Qur’an', text: 'With hardship comes ease.', source: 'Qur’an 94:6' },
  { type: 'Qur’an', text: 'Allah is with those who are patient.', source: 'Qur’an 2:153' },
  { type: 'Qur’an', text: 'Hearts find rest in the remembrance of Allah.', source: 'Qur’an 13:28' },
  { type: 'Qur’an', text: 'Do not lose hope in the mercy of Allah.', source: 'Qur’an 39:53' },
  { type: 'Hadith', text: 'Actions are judged by intentions.', source: 'Bukhari 1' },
  { type: 'Hadith', text: 'A good word is charity.', source: 'Bukhari 2989' },
  { type: 'Hadith', text: 'Allah is gentle and loves gentleness.', source: 'Muslim 2593' },
  { type: 'Reflection', text: 'Make time today for prayer, kindness and sincere du‘a.', source: 'Daily reminder' },
];

const shortTime = value => value && value !== 'N/A' ? String(value).replace(/^0/, '').replace(/\s?[AP]M$/i, '') : '—';
const safeGet = (key, fallback) => { try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const safeSet = (key, value) => { try { window.localStorage.setItem(key, value); } catch {} };
const isExtensionPath = pathname => EXTENSION_PATHS.some(path => pathname === path || pathname.startsWith('/projects/masjid-extension/'));

function activeGroupFor(pathname) {
  if (['/team', '/contact', '/financial-history'].includes(pathname)) return NAV_GROUPS.find(x => x.name === 'About');
  if (pathname.startsWith('/funerals')) return NAV_GROUPS.find(x => x.name === 'Services');
  return NAV_GROUPS.find(group => group.path === '/' ? pathname === '/' : pathname === group.path || pathname.startsWith(`${group.path}/`));
}

function isCurrent(pathname, itemPath) {
  return pathname === itemPath || (itemPath !== '/' && pathname.startsWith(`${itemPath}/`)) ||
    (pathname === '/projects/timeline' && itemPath === '/projects/masjid-extension/timeline') ||
    (pathname === '/projects/madrassah-building' && itemPath === '/projects/madrassah-floor');
}

function hijriDate() {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  } catch { return ''; }
}

export default function UnifiedHeader() {
  const { pathname } = useLocation();
  const { todaysTimes, jummahTimes, currentDate } = usePrayerTimes();
  const headerRef = useRef(null);
  const audioRef = useRef(null);
  const scrollStateRef = useRef(false);
  const next = nextPrayer(todaysTimes, currentDate);
  const nextJamaah = next ? todaysTimes?.[JAMAAH_KEYS[next.name]] : null;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const isPrayerSection = pathname === '/prayer-times' || pathname.startsWith('/prayer-times/');

  const [theme, setTheme] = useState(() => safeGet('jic-theme', 'dark'));
  const [playing, setPlaying] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const [donationOpen, setDonationOpen] = useState(false);
  const [reminderIndex, setReminderIndex] = useState(() => Math.floor(Date.now() / 86400000) % REMINDERS.length);

  const activeGroup = useMemo(() => activeGroupFor(pathname), [pathname]);
  const subnavItems = isExtensionPath(pathname) ? MASJID_EXTENSION_TABS : (activeGroup?.children || []);
  const subnavLabel = isExtensionPath(pathname) ? 'Masjid Extension' : activeGroup?.name;
  const selectedSubtab = subnavItems.filter(item => isCurrent(pathname, item.path)).sort((a, b) => b.path.length - a.path.length)[0]?.path;
  const reminder = REMINDERS[reminderIndex % REMINDERS.length];
  const islamicDate = useMemo(hijriDate, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeSet('jic-theme', theme);
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileGroup(null);
    setReminderIndex(index => (index + 1) % REMINDERS.length);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => setReminderIndex(index => (index + 1) % REMINDERS.length), 60000);
    const onScroll = () => {
      const nearTop = window.scrollY < 32;
      if (nearTop && !scrollStateRef.current) setReminderIndex(index => (index + 1) % REMINDERS.length);
      scrollStateRef.current = nearTop;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [menuOpen]);

  useEffect(() => {
    const node = headerRef.current;
    if (!node) return;
    const update = () => document.documentElement.style.setProperty('--jic-header-height', `${Math.ceil(node.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const toggleTheme = () => setTheme(value => value === 'dark' ? 'light' : 'dark');

  const toggleRadio = async () => {
    if (!streamUrl) return;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = 'none';
      audio.src = streamUrl;
      audioRef.current = audio;
      audio.addEventListener('playing', () => { setPlaying(true); setRadioError(false); });
      audio.addEventListener('pause', () => setPlaying(false));
      audio.addEventListener('error', () => { setPlaying(false); setRadioError(true); });
    }
    try {
      if (playing) audioRef.current.pause();
      else {
        audioRef.current.src = streamUrl;
        audioRef.current.load();
        await audioRef.current.play();
      }
    } catch {
      setPlaying(false);
      setRadioError(true);
    }
  };

  const firstJummah = jummahTimes?.[0] || {};
  const secondJummah = jummahTimes?.[1] || {};

  return <>
    <header ref={headerRef} className="jic-unified-header fixed inset-x-0 top-0 z-50">
      <div className="jic-unified-inner">
        <div className="jic-unified-info jic-glass">
          <div className="jic-unified-address">
            <span><MapPin size={15}/>Woodlands Rd · Birmingham · B11 4ER</span>
            <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}><Phone size={14}/>{SITE.phone}</a>
          </div>

          {!isPrayerSection && <div className="jic-today-prayer-row" aria-label="Today's prayer times">
            {PRAYERS.map(([label, startKey, jamaahKey]) => <Link to="/prayer-times" className="jic-today-prayer" key={startKey}>
              <span>{label}</span>
              <div><strong>{shortTime(todaysTimes?.[startKey])}</strong>{jamaahKey && <em>{shortTime(todaysTimes?.[jamaahKey])}</em>}</div>
              <small><b>START</b>{jamaahKey && <b>JAMA‘AT</b>}</small>
            </Link>)}
          </div>}

          <div className="jic-unified-summary">
            <Link to="/prayer-times" className="jic-next-summary">
              <span className="jic-summary-label">NEXT PRAYER</span>
              <strong>{next?.name || 'Prayer times'}</strong>
              <small><b>START</b> {shortTime(next?.time)} <i/> <b>JAMA‘AH</b> {shortTime(nextJamaah)}</small>
            </Link>

            <Link to="/prayer-times/jummah" className="jic-jummah-summary">
              <span className="jic-summary-label">JUMMAH</span>
              <div className="jic-jummah-lines">
                <small><b>1ST</b> Start {shortTime(firstJummah.khutbah)} · Jama‘ah {shortTime(firstJummah.prayer)}</small>
                <small><b>2ND</b> Start {shortTime(secondJummah.khutbah)} · Jama‘ah {shortTime(secondJummah.prayer)}</small>
              </div>
            </Link>

            <button type="button" className={cn('jic-radio-flat', playing && 'is-playing')} onClick={toggleRadio} disabled={!streamUrl} aria-pressed={playing} aria-label={playing ? 'Pause JIC Radio' : 'Play JIC Radio'}>
              {playing ? <Pause size={18}/> : <Play size={18}/>}<span>Radio</span><i/>
              <small>{radioError ? 'Retry' : playing ? 'Live' : 'Listen'}</small>
            </button>
          </div>
        </div>

        <div className="jic-free-nav-row">
          <Link to="/" className="jic-free-brand" aria-label="Jamatia Islamic Centre home"><JamatiaLogo/></Link>
          <div className="jic-free-actions">
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>
            <button type="button" className="is-donate" onClick={() => setDonationOpen(true)} aria-label="Donate"><Heart size={20}/></button>
            <button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu" aria-expanded={menuOpen}><Menu size={22}/></button>
          </div>
        </div>

        {subnavItems.length > 0 && <nav className="jic-unified-subnav" aria-label={`${subnavLabel} sections`}>
          {subnavItems.map(item => <Link key={`${subnavLabel}-${item.name}`} to={item.path} aria-current={item.path === selectedSubtab ? 'page' : undefined} className={cn('jic-unified-subnav-link', item.path === selectedSubtab && 'is-current')}>{item.name}</Link>)}
        </nav>}

        <button type="button" className="jic-unified-reminder" onClick={() => setReminderIndex(index => (index + 1) % REMINDERS.length)} aria-label="Show another reminder">
          <div><b>{reminder.type}</b><span>{islamicDate}</span></div>
          <strong>{reminder.text}</strong><small>{reminder.source}</small>
        </button>
      </div>
    </header>

    {menuOpen && <div className="jic-unified-menu" role="dialog" aria-modal="true" aria-label="Main menu">
      <div className="jic-unified-menu-head"><Link to="/" onClick={() => setMenuOpen(false)}><JamatiaLogo/></Link><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={24}/></button></div>
      <div className="jic-unified-menu-scroll">
        {NAV_GROUPS.map(({ name, path, children }) => <div className="jic-unified-menu-group" key={path}>
          <div className="jic-unified-menu-row">
            <NavLink to={path} end={path === '/'} onClick={() => !children.length && setMenuOpen(false)}>{name}</NavLink>
            {children.length > 0 && <button type="button" onClick={() => setMobileGroup(current => current === name ? null : name)} aria-expanded={mobileGroup === name}>+</button>}
          </div>
          {children.length > 0 && mobileGroup === name && <div className="jic-unified-menu-children">{children.filter(child => child.path !== path).map(child => <Link key={`${name}-${child.name}`} to={child.path} onClick={() => setMenuOpen(false)}>{child.name}</Link>)}</div>}
        </div>)}
        <Link to="/admin/login" className="jic-unified-admin-link" onClick={() => setMenuOpen(false)}><LogIn size={17}/>Admin login</Link>
        <button type="button" className="jic-unified-menu-donate" onClick={() => { setMenuOpen(false); setDonationOpen(true); }}><Heart size={18}/>Donate</button>
      </div>
    </div>}

    <WonderfulDonationModal open={donationOpen} onClose={() => setDonationOpen(false)}/>
  </>;
}
