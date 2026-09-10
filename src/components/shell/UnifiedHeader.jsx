import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, LogIn, MapPin, Menu, Moon, Pause, Play, Phone, Sparkles, Sun, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { NAV_GROUPS, MASJID_EXTENSION_TABS, MADRASSAH_TABS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { nextPrayer } from '@/lib/nextPrayer';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/context/AppearanceContext';
import { supabase } from '@/lib/supabaseClient';

const PRAYERS = [
  ['Fajr', 'fajr', 'jamaah_fajr'], ['Sunrise', 'sunrise', null], ['Dhuhr', 'dhuhr', 'jamaah_dhuhr'],
  ['Asr', 'asr', 'jamaah_asr'], ['Maghrib', 'maghrib', 'jamaah_maghrib'], ['Isha', 'isha', 'jamaah_isha'],
];
const JAMAAH_KEYS = { Fajr: 'jamaah_fajr', Dhuhr: 'jamaah_dhuhr', Asr: 'jamaah_asr', Maghrib: 'jamaah_maghrib', Isha: 'jamaah_isha' };
const EXTENSION_PATHS = ['/projects/masjid-extension','/projects/main-prayer-hall','/projects/wudu-area','/projects/community-hall','/projects/madrassah-floor','/projects/madrassah-building','/projects/timeline'];
const MADRASSAH_DETAIL_PATHS = ['/madrassah/programs','/madrassah/special-courses','/madrassah/enrolment','/madrassah/policies'];

const DEFAULT_REMINDERS = [
  { type: 'Qur’an', text: 'Remember Me; I will remember you.', source: 'Qur’an 2:152' },
  { type: 'Qur’an', text: 'Allah is near and responds when His servants call upon Him.', source: 'Qur’an 2:186' },
  { type: 'Qur’an', text: 'Do not falter or grieve.', source: 'Qur’an 3:139' },
  { type: 'Qur’an', text: 'Allah is with those who persevere.', source: 'Qur’an 8:46' },
  { type: 'Qur’an', text: 'In the remembrance of Allah hearts find comfort.', source: 'Qur’an 13:28' },
  { type: 'Qur’an', text: 'Establish prayer for My remembrance.', source: 'Qur’an 20:14' },
  { type: 'Qur’an', text: 'Allah guides those who strive in His cause.', source: 'Qur’an 29:69' },
  { type: 'Qur’an', text: 'Do not lose hope in Allah’s mercy.', source: 'Qur’an 39:53' },
  { type: 'Qur’an', text: 'Whoever trusts Allah will find Him sufficient.', source: 'Qur’an 65:3' },
  { type: 'Qur’an', text: 'Surely with hardship comes ease.', source: 'Qur’an 94:5–6' },
  { type: 'Hadith', text: 'Actions are judged by intentions.', source: 'Bukhari 1' },
  { type: 'Hadith', text: 'A good word is charity.', source: 'Bukhari 2989' },
  { type: 'Hadith', text: 'Allah is gentle and loves gentleness.', source: 'Muslim 2593' },
  { type: 'Reflection', text: 'Make time today for prayer, kindness and sincere du‘a.', source: 'Daily reminder' },
];

const shortTime = value => value && value !== 'N/A' ? String(value).replace(/^0/, '').replace(/\s?[AP]M$/i, '') : '—';
const isExtensionPath = pathname => EXTENSION_PATHS.some(path => pathname === path || pathname.startsWith('/projects/masjid-extension/'));
const isMadrassahDetailPath = pathname => MADRASSAH_DETAIL_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

function activeGroupFor(pathname) {
  if (['/team', '/contact', '/financial-history'].includes(pathname)) return NAV_GROUPS.find(item => item.name === 'About');
  if (pathname.startsWith('/funerals')) return NAV_GROUPS.find(item => item.name === 'Services');
  return NAV_GROUPS.find(group => group.path === '/' ? pathname === '/' : pathname === group.path || pathname.startsWith(`${group.path}/`));
}
function isCurrent(pathname, itemPath) {
  return pathname === itemPath || (itemPath !== '/' && pathname.startsWith(`${itemPath}/`)) ||
    (pathname === '/projects/timeline' && itemPath === '/projects/masjid-extension/timeline') ||
    (pathname === '/projects/madrassah-building' && itemPath === '/projects/madrassah-floor');
}
function hijriDate() {
  try { return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()); }
  catch { return ''; }
}
function parseJson(value, fallback) {
  try { const parsed = JSON.parse(value || ''); return Array.isArray(parsed) && parsed.length ? parsed : fallback; }
  catch { return fallback; }
}

export default function UnifiedHeader() {
  const { pathname } = useLocation();
  const { theme, toggleTheme, glassEnabled, toggleGlass } = useAppearance();
  const { todaysTimes, jummahTimes, currentDate } = usePrayerTimes();
  const headerRef = useRef(null);
  const audioRef = useRef(null);
  const next = nextPrayer(todaysTimes, currentDate);
  const nextJamaah = next ? todaysTimes?.[JAMAAH_KEYS[next.name]] : null;
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const isPrayerSection = pathname === '/prayer-times' || pathname.startsWith('/prayer-times/');

  const [playing, setPlaying] = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);
  const [donationOpen, setDonationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 28);
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [tickerExtras, setTickerExtras] = useState([]);
  const [reminderIndex, setReminderIndex] = useState(() => Math.floor(Date.now() / 86400000) % DEFAULT_REMINDERS.length);

  const activeGroup = useMemo(() => activeGroupFor(pathname), [pathname]);
  const subnavItems = isExtensionPath(pathname) ? MASJID_EXTENSION_TABS : isMadrassahDetailPath(pathname) ? MADRASSAH_TABS : (activeGroup?.children || []);
  const subnavLabel = isExtensionPath(pathname) ? 'Masjid Extension' : isMadrassahDetailPath(pathname) ? 'Madrassah' : activeGroup?.name;
  const selectedSubtab = subnavItems.filter(item => isCurrent(pathname, item.path)).sort((a, b) => b.path.length - a.path.length)[0]?.path;
  const reminder = reminders[reminderIndex % reminders.length] || DEFAULT_REMINDERS[0];
  const islamicDate = useMemo(hijriDate, []);
  const firstJummah = jummahTimes?.[0] || {};
  const secondJummah = jummahTimes?.[1] || {};

  const tickerItems = useMemo(() => [
    { label: 'NEXT PRAYER', text: `${next?.name || 'Prayer'} · Start ${shortTime(next?.time)} · Jama‘ah ${shortTime(nextJamaah)}`, to: '/prayer-times' },
    { label: 'JUMMAH 1', text: `Khutbah ${shortTime(firstJummah.khutbah)} · Jama‘ah ${shortTime(firstJummah.prayer)}`, to: '/prayer-times/jummah' },
    { label: 'JUMMAH 2', text: `Khutbah ${shortTime(secondJummah.khutbah)} · Jama‘ah ${shortTime(secondJummah.prayer)}`, to: '/prayer-times/jummah' },
    ...tickerExtras.map(item => ({ ...item, to: item.to || '/' })),
  ], [next, nextJamaah, firstJummah, secondJummah, tickerExtras]);

  useEffect(() => {
    let active = true;
    const load = () => Promise.all([
      supabase.from('page_content').select('content_value').eq('content_key', 'header_reminders').maybeSingle(),
      supabase.from('page_content').select('content_value').eq('content_key', 'header_ticker_items').maybeSingle(),
    ]).then(([reminderResult, tickerResult]) => {
      if (!active) return;
      setReminders(parseJson(reminderResult.data?.content_value, DEFAULT_REMINDERS));
      setTickerExtras(parseJson(tickerResult.data?.content_value, []));
    });
    load();
    const onUpdate = () => load();
    window.addEventListener('jic-content-updated', onUpdate);
    return () => { active = false; window.removeEventListener('jic-content-updated', onUpdate); };
  }, []);

  useEffect(() => { setMenuOpen(false); setMobileGroup(null); setReminderIndex(index => (index + 1) % Math.max(reminders.length, 1)); }, [pathname, reminders.length]);
  useEffect(() => {
    const timer = window.setInterval(() => setReminderIndex(index => (index + 1) % Math.max(reminders.length, 1)), 45000);
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearInterval(timer); window.removeEventListener('scroll', onScroll); };
  }, [reminders.length]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = oldOverflow; };
  }, [menuOpen]);
  useEffect(() => {
    const node = headerRef.current;
    if (!node) return undefined;
    const update = () => document.documentElement.style.setProperty('--jic-header-height', `${Math.ceil(node.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  }, []);

  const toggleRadio = async () => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    setRadioError(false);
    try {
      if (!audio.paused) { audio.pause(); return; }
      setRadioLoading(true);
      await audio.play();
    } catch (error) {
      console.error('Unable to start JIC Radio:', error);
      setPlaying(false); setRadioLoading(false); setRadioError(true);
    }
  };

  return <>
    <audio ref={audioRef} src={streamUrl || undefined} preload="none" playsInline onLoadStart={() => setRadioLoading(true)} onCanPlay={() => setRadioLoading(false)} onPlaying={() => { setPlaying(true); setRadioLoading(false); setRadioError(false); }} onPause={() => { setPlaying(false); setRadioLoading(false); }} onWaiting={() => setRadioLoading(true)} onError={() => { setPlaying(false); setRadioLoading(false); setRadioError(true); }} aria-hidden="true"/>

    <header ref={headerRef} className={cn('jic-unified-header fixed inset-x-0 top-0 z-50', scrolled && 'is-scrolled')}>
      <div className="jic-unified-inner">
        <div className="jic-unified-info jic-glass">
          <div className="jic-unified-address"><span><MapPin size={15}/>{SITE.address.short}</span><a href={`tel:${SITE.phone.replace(/\s/g, '')}`}><Phone size={14}/>{SITE.phone}</a></div>

          {!isPrayerSection && <div className="jic-today-prayer-row" aria-label="Today's prayer times">{PRAYERS.map(([label, startKey, jamaahKey]) => <Link to="/prayer-times" className="jic-today-prayer" key={startKey}><span>{label}</span><div><strong>{shortTime(todaysTimes?.[startKey])}</strong>{jamaahKey && <em>{shortTime(todaysTimes?.[jamaahKey])}</em>}</div><small><b>START</b>{jamaahKey && <b>JAMA‘AT</b>}</small></Link>)}</div>}

          <div className="jic-header-live-row">
            <div className="jic-prayer-ticker" aria-label="Prayer and Jummah updates">
              <div className="jic-prayer-ticker-track">
                {[...tickerItems, ...tickerItems].map((item, index) => <Link to={item.to} key={`${item.label}-${index}`}><b>{item.label}</b><span>{item.text}</span><i aria-hidden="true">•</i></Link>)}
              </div>
            </div>
            <button type="button" className={cn('jic-radio-flat', playing && 'is-playing')} onClick={toggleRadio} disabled={!streamUrl} aria-pressed={playing} aria-label={playing ? 'Pause JIC Radio' : 'Play JIC Radio'}>{playing ? <Pause size={16}/> : <Play size={16}/>}<span>Radio</span><i/><small>{radioError ? 'Retry' : radioLoading ? 'Loading' : playing ? 'Live' : 'Listen'}</small></button>
          </div>
        </div>

        <div className="jic-free-nav-row"><Link to="/" className="jic-free-brand" aria-label="Jamatia Islamic Centre home"><JamatiaLogo/></Link><div className="jic-free-actions"><button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button><button type="button" className="is-donate" onClick={() => setDonationOpen(true)} aria-label="Donate"><Heart size={20}/></button><button type="button" onClick={() => setMenuOpen(true)} aria-label="Menu" aria-expanded={menuOpen}><Menu size={22}/></button></div></div>

        {subnavItems.length > 0 && <nav className="jic-unified-subnav" aria-label={`${subnavLabel} sections`}>{subnavItems.map(item => <Link key={`${subnavLabel}-${item.name}`} to={item.path} aria-current={item.path === selectedSubtab ? 'page' : undefined} className={cn('jic-unified-subnav-link', item.path === selectedSubtab && 'is-current')}>{item.name}</Link>)}</nav>}

        {!scrolled && <button type="button" className="jic-unified-reminder" onClick={() => setReminderIndex(index => (index + 1) % Math.max(reminders.length, 1))} aria-label="Show another reminder"><div><b>{reminder.type}</b><span>{islamicDate}</span></div><strong>{reminder.text}</strong><small>{reminder.source}</small></button>}
      </div>
    </header>

    {menuOpen && <div className="jic-unified-menu" role="dialog" aria-modal="true" aria-label="Main menu"><div className="jic-unified-menu-head"><Link to="/" onClick={() => setMenuOpen(false)}><JamatiaLogo/></Link><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={24}/></button></div><div className="jic-unified-menu-scroll"><div className="jic-menu-appearance" aria-label="Appearance settings"><button type="button" onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>} {theme === 'dark' ? 'Light mode' : 'Dark mode'}</button><button type="button" onClick={toggleGlass}><Sparkles size={17}/> Glass {glassEnabled ? 'on' : 'off'}</button></div>{NAV_GROUPS.map(({ name, path, children }) => <div className="jic-unified-menu-group" key={path}><div className="jic-unified-menu-row"><NavLink to={path} end={path === '/'} onClick={() => !children.length && setMenuOpen(false)}>{name}</NavLink>{children.length > 0 && <button type="button" onClick={() => setMobileGroup(current => current === name ? null : name)} aria-expanded={mobileGroup === name}>+</button>}</div>{children.length > 0 && mobileGroup === name && <div className="jic-unified-menu-children">{children.filter(child => name === 'Education' || child.path !== path).map(child => <Link key={`${name}-${child.name}`} to={child.path} onClick={() => setMenuOpen(false)}>{child.name}</Link>)}</div>}</div>)}<Link to="/admin/login" className="jic-unified-admin-link" onClick={() => setMenuOpen(false)}><LogIn size={17}/>Admin login</Link><button type="button" className="jic-unified-menu-donate" onClick={() => { setMenuOpen(false); setDonationOpen(true); }}><Heart size={18}/>Donate</button></div></div>}
    <WonderfulDonationModal open={donationOpen} onClose={() => setDonationOpen(false)}/>
  </>;
}
