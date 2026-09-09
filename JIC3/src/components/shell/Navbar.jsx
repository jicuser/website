import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, HandHeart, MapPin, Menu, Moon, Pause, Play, Radio, Settings2, Sun, X } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import { NAV_ITEMS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { cn } from '@/lib/utils';

const PRAYERS = [
  ['Fajr','fajr'], ['Sunrise','sunrise'], ['Dhuhr','dhuhr'], ['Asr','asr'], ['Maghrib','maghrib'], ['Isha','isha'],
];

const shortTime = value => value && value !== 'N/A'
  ? String(value).replace(/^0/, '').replace(/\s?[AP]M$/i, '')
  : '—';

const displayTime = value => value && value !== 'N/A' ? String(value).replace(/^0/, '') : null;

export default function Navbar() {
  const { todaysTimes } = usePrayerTimes();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('jic-theme') || 'dark');
  const [glass, setGlass] = useState(() => localStorage.getItem('jic-glass') !== 'off');
  const [utility, setUtility] = useState(() => localStorage.getItem('jic-utility') !== 'off');
  const [playing, setPlaying] = useState(false);
  const [radioError, setRadioError] = useState(false);
  const audioRef = useRef(null);
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.dataset.surface = glass ? 'glass' : 'solid';
    localStorage.setItem('jic-theme', theme);
    localStorage.setItem('jic-glass', glass ? 'on' : 'off');
    localStorage.setItem('jic-utility', utility ? 'on' : 'off');
  }, [theme, glass, utility]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const toggleRadio = async () => {
    if (!streamUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(streamUrl);
      audioRef.current.preload = 'none';
      audioRef.current.addEventListener('playing', () => { setPlaying(true); setRadioError(false); });
      audioRef.current.addEventListener('pause', () => setPlaying(false));
      audioRef.current.addEventListener('error', () => { setPlaying(false); setRadioError(true); });
    }
    try {
      if (playing) audioRef.current.pause();
      else await audioRef.current.play();
    } catch {
      setPlaying(false);
      setRadioError(true);
    }
  };

  // DB values win; these are safe visual fallbacks until live timetable data loads.
  const jummah1 = displayTime(todaysTimes?.jummah_1_jamah || todaysTimes?.jummah_1_start) || '1:00 PM';
  const jummah2 = displayTime(todaysTimes?.jummah_2_jamah || todaysTimes?.jummah_2_start) || '2:30 PM';

  return <header className="jic-header fixed inset-x-0 top-0 z-50">
    <div className="mx-auto max-w-[1500px] px-2 sm:px-4 pt-2">
      {utility && <div className="jic-glass utility-bar rounded-2xl overflow-hidden">
        <div className="utility-scroll">
          <a className="utility-item utility-address" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address.full)}`} target="_blank" rel="noreferrer">
            <MapPin size={16}/><span className="truncate">Woodlands Rd · B11 4ER</span>
          </a>
          <div className="utility-item utility-jummah">
            <CalendarDays size={16}/><span className="utility-label">Jummah</span><b>{jummah1}</b><span className="opacity-35">•</span><b>{jummah2}</b>
          </div>
          <button className={cn('utility-item utility-radio', playing && 'radio-playing')} onClick={toggleRadio} aria-label={playing ? 'Pause JIC Radio' : 'Play JIC Radio'}>
            {playing ? <Pause size={16}/> : <Play size={16}/>}<span>JIC Radio</span><span className="live-dot" aria-hidden="true"/>
            <span className="radio-status">{radioError ? 'Retry' : playing ? 'Live' : 'Play'}</span>
          </button>
        </div>
      </div>}

      <div className="jic-glass main-bar mt-2 rounded-2xl px-3 sm:px-5">
        <div className="flex h-[68px] md:h-[84px] items-center gap-2 sm:gap-3">
          <Link to="/" className="shrink-0" aria-label="Jamatia Islamic Centre home"><JamatiaLogo className="w-[132px] sm:w-[178px] md:w-[205px]"/></Link>
          <nav className="hidden lg:flex ml-auto items-center gap-1">
            {NAV_ITEMS.slice(0,7).map(({name,path}) => <NavLink key={path} to={path} className={({isActive}) => cn('nav-pill', isActive && 'active')}>{name}</NavLink>)}
          </nav>
          <div className="ml-auto lg:ml-3 flex items-center gap-2">
            <Link to="/projects" className="donate-button" aria-label="Donate to JIC"><HandHeart size={19}/><span className="hidden sm:inline">Donate</span></Link>
            <button className="header-icon hidden sm:grid" onClick={() => { setSettingsOpen(v=>!v); setMenuOpen(false); }} aria-label="Display settings"><Settings2 size={19}/></button>
            <button className="header-icon" onClick={() => { setMenuOpen(v=>!v); setSettingsOpen(false); }} aria-label="Menu">{menuOpen ? <X size={22}/> : <Menu size={22}/>}</button>
          </div>
        </div>

        <AnimatePresence>{(menuOpen || settingsOpen) && <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden border-t border-white/10">
          <div className="grid md:grid-cols-[1fr_auto] gap-4 py-4">
            {menuOpen && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
              {NAV_ITEMS.map(({name,path}) => <NavLink key={path} to={path} onClick={()=>setMenuOpen(false)} className="drawer-link">{name}</NavLink>)}
            </div>}
            <div className={cn('flex flex-wrap items-center gap-2', menuOpen ? '' : 'md:col-span-2 md:justify-end')}>
              <button className="setting-chip" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={16}/>:<Moon size={16}/>} {theme==='dark'?'Light':'Dark'}</button>
              <button className="setting-chip" onClick={()=>setGlass(v=>!v)}><Settings2 size={16}/> {glass?'Solid':'Glass'}</button>
              <button className="setting-chip" onClick={()=>setUtility(v=>!v)}>{utility?'Hide info bar':'Show info bar'}</button>
            </div>
          </div>
        </motion.div>}</AnimatePresence>
      </div>

      <div className="jic-glass prayer-bar mt-2 rounded-2xl">
        <div className="prayer-scroll">
          {PRAYERS.map(([label,key]) => <div className="prayer-cell" key={key}><span>{label}</span><strong>{shortTime(todaysTimes?.[key])}</strong></div>)}
          <Link to="/prayer-times" className="full-timetable">Full Timetable <span>→</span></Link>
        </div>
      </div>
    </div>
  </header>;
}
