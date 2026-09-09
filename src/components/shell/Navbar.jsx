import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MapPin, Menu, Moon, Pause, Play, Sun, X, ChevronDown, LogIn, Phone, Settings2, Mail } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { NAV_GROUPS, MASJID_EXTENSION_TABS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { cn } from '@/lib/utils';

const PRAYERS = [
  ['Fajr','fajr','jamaah_fajr'],
  ['Sunrise','sunrise',null],
  ['Dhuhr','dhuhr','jamaah_dhuhr'],
  ['Asr','asr','jamaah_asr'],
  ['Maghrib','maghrib','jamaah_maghrib'],
  ['Isha','isha','jamaah_isha'],
];
const shortTime = v => v && v !== 'N/A' ? String(v).replace(/^0/,'').replace(/\s?[AP]M$/i,'') : '—';
const safeGet=(key,fallback)=>{try{return window.localStorage.getItem(key)??fallback;}catch{return fallback;}};
const safeSet=(key,value)=>{try{window.localStorage.setItem(key,value);}catch{}};
const EXTENSION_PATHS=['/projects/masjid-extension','/projects/main-prayer-hall','/projects/wudu-area','/projects/community-hall','/projects/madrassah-floor','/projects/madrassah-building','/projects/timeline'];
const isExtensionPath=pathname=>EXTENSION_PATHS.some(p=>pathname===p||pathname.startsWith('/projects/masjid-extension/'));
const getActiveGroup=(pathname)=>{
  if(['/team','/contact','/financial-history'].includes(pathname)) return NAV_GROUPS.find(x=>x.name==='About');
  if(pathname.startsWith('/funerals')) return NAV_GROUPS.find(x=>x.name==='Services');
  return NAV_GROUPS.find(group=>group.path==='/'?pathname==='/':pathname===group.path||pathname.startsWith(`${group.path}/`));
};
const isCurrentSubtab=(pathname,itemPath)=> pathname===itemPath || (itemPath!=='/' && pathname.startsWith(`${itemPath}/`)) || (pathname==='/projects/timeline'&&itemPath==='/projects/masjid-extension/timeline') || (pathname==='/projects/madrassah-building'&&itemPath==='/projects/madrassah-floor');

const REMINDERS = [
  {type:'Qur’an',text:'With hardship comes ease.',source:'Qur’an 94:6'},
  {type:'Qur’an',text:'Allah is with those who are patient.',source:'Qur’an 2:153'},
  {type:'Qur’an',text:'Hearts find rest in the remembrance of Allah.',source:'Qur’an 13:28'},
  {type:'Qur’an',text:'Do not lose hope in the mercy of Allah.',source:'Qur’an 39:53'},
  {type:'Hadith',text:'Actions are judged by intentions.',source:'Bukhari 1'},
  {type:'Hadith',text:'A good word is charity.',source:'Bukhari 2989'},
  {type:'Hadith',text:'Allah is gentle and loves gentleness.',source:'Muslim 2593'},
  {type:'History',text:'The Hijri calendar begins from the migration to Madinah.',source:'Islamic history'},
  {type:'Reflection',text:'Make time today for prayer, kindness and sincere du‘a.',source:'Daily reminder'},
];
function daySeed(){const now=new Date();const start=new Date(now.getFullYear(),0,0);return Math.floor((now-start)/86400000);}
function getHijriDate(){try{return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura',{day:'numeric',month:'short',year:'numeric'}).format(new Date());}catch{return '';}}

export default function Navbar(){
  const {pathname}=useLocation();
  const {todaysTimes,jummahTimes}=usePrayerTimes();
  const [menuOpen,setMenuOpen]=useState(false);
  const [megaOpen,setMegaOpen]=useState(null);
  const [mobileGroup,setMobileGroup]=useState(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [reminderOpen,setReminderOpen]=useState(false);
  const [theme,setTheme]=useState(()=>safeGet('jic-theme','dark'));
  const [glass,setGlass]=useState(()=>safeGet('jic-glass','on')!=='off');
  const [glassOpacity,setGlassOpacity]=useState(()=>Math.min(92,Math.max(45,Number(safeGet('jic-glass-opacity','72'))||72)));
  const [playing,setPlaying]=useState(false);
  const [radioError,setRadioError]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [reminderIndex,setReminderIndex]=useState(()=>daySeed()%REMINDERS.length);
  const [donationOpen,setDonationOpen]=useState(false);
  const audioRef=useRef(null);
  const scrolledRef=useRef(false);
  const streamUrl=import.meta.env.VITE_RADIO_STREAM_URL||SITE.radio?.streamUrl||'';
  const activeGroup=useMemo(()=>getActiveGroup(pathname),[pathname]);
  const openMegaGroup=useMemo(()=>NAV_GROUPS.find(group=>group.name===megaOpen),[megaOpen]);
  const reminder=REMINDERS[reminderIndex%REMINDERS.length];
  const reminderLong=reminder.text.length>48;
  const hijriDate=useMemo(()=>getHijriDate(),[]);
  const subnavItems=isExtensionPath(pathname)?MASJID_EXTENSION_TABS:(activeGroup?.children||[]);
  const subnavLabel=isExtensionPath(pathname)?'Masjid Extension':activeGroup?.name;
  const overlayOpen=menuOpen||settingsOpen||reminderOpen;

  useEffect(()=>{
    document.documentElement.classList.toggle('dark',theme==='dark');
    document.documentElement.dataset.surface=glass?'glass':'solid';
    document.documentElement.style.setProperty('--jic-glass-alpha',String(glassOpacity/100));
    safeSet('jic-theme',theme);
    safeSet('jic-glass',glass?'on':'off');
    safeSet('jic-glass-opacity',String(glassOpacity));
  },[theme,glass,glassOpacity]);
  useEffect(()=>{const onScroll=()=>{if(overlayOpen)return;const next=window.scrollY>48;if(next&&!scrolledRef.current)setReminderIndex(i=>(i+1)%REMINDERS.length);scrolledRef.current=next;setScrolled(next);};onScroll();window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[overlayOpen]);
  useEffect(()=>{if(!scrolled)return;const timer=window.setInterval(()=>setReminderIndex(i=>(i+1)%REMINDERS.length),300000);return()=>window.clearInterval(timer);},[scrolled]);
  useEffect(()=>()=>{if(audioRef.current){audioRef.current.pause();audioRef.current.src='';}},[]);
  useEffect(()=>{setMenuOpen(false);setMegaOpen(null);setMobileGroup(null);setSettingsOpen(false);setReminderOpen(false);},[pathname]);
  useEffect(()=>{const open=()=>setDonationOpen(true);window.addEventListener('jic-open-donation',open);return()=>window.removeEventListener('jic-open-donation',open);},[]);
  useEffect(()=>{if(!menuOpen&&!settingsOpen)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[menuOpen,settingsOpen]);

  const toggleRadio=async()=>{if(!streamUrl)return;if(!audioRef.current){audioRef.current=new Audio(streamUrl);audioRef.current.preload='none';audioRef.current.addEventListener('playing',()=>{setPlaying(true);setRadioError(false);});audioRef.current.addEventListener('pause',()=>setPlaying(false));audioRef.current.addEventListener('error',()=>{setPlaying(false);setRadioError(true);});}try{playing?audioRef.current.pause():await audioRef.current.play();}catch{setPlaying(false);setRadioError(true);}};
  const openDonation=()=>{setMenuOpen(false);setMegaOpen(null);setSettingsOpen(false);setReminderOpen(false);setDonationOpen(true);};
  const openSettings=()=>{setSettingsOpen(v=>!v);setMenuOpen(false);setReminderOpen(false);};
  const openMenu=()=>{setMenuOpen(v=>!v);setSettingsOpen(false);setReminderOpen(false);};
  const toggleReminder=()=>{if(reminderLong)setReminderOpen(v=>!v);};

  const SettingsPanel=()=> <div className="jic-settings-panel jic-glass" role="dialog" aria-label="Display settings">
    <div className="jic-settings-head"><div><strong>Settings</strong><span>Display preferences</span></div><button type="button" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={17}/></button></div>
    <button type="button" className="jic-setting-row" onClick={()=>setTheme(theme==='dark'?'light':'dark')}><span className="jic-setting-icon">{theme==='dark'?<Moon size={17}/>:<Sun size={17}/>}</span><span><strong>Appearance</strong><small>{theme==='dark'?'Dark':'Light'} mode</small></span><b>{theme==='dark'?'Dark':'Light'}</b></button>
    <button type="button" className="jic-setting-row" onClick={()=>setGlass(v=>!v)}><span className="jic-setting-icon"><span className={cn('glass-switch',glass&&'on')}><i/></span></span><span><strong>Glass effects</strong><small>Translucent interface surfaces</small></span><b>{glass?'On':'Off'}</b></button>
    <label className={cn('jic-setting-slider',!glass&&'is-disabled')}><span><strong>Transparency</strong><small>Adjust how clear the glass is</small></span><b>{glassOpacity}%</b><input type="range" min="45" max="92" step="1" value={glassOpacity} disabled={!glass} onChange={e=>setGlassOpacity(Number(e.target.value))}/></label>
  </div>;

  return <>
    <header className={cn('jic-header fixed inset-x-0 top-0 z-50',scrolled&&'is-scrolled',overlayOpen&&'has-overlay-open')}>
      <div className="mx-auto max-w-[1500px] px-2 sm:px-4 pt-2">
        <div className="jic-glass jic-info-shell overflow-hidden">
          <div className="jic-address"><MapPin size={15}/><span>Woodlands Rd · Birmingham · B11 4ER</span><a className="jic-top-phone" href={`tel:${SITE.phone.replace(/\s/g,'')}`}><Phone size={13}/><span>{SITE.phone}</span></a><a className="jic-top-email" href={`mailto:${SITE.email}`}><Mail size={13}/><span>{SITE.email}</span></a></div>
          <div className="jic-prayer-row">{PRAYERS.map(([label,key,jamaahKey])=><div className="jic-prayer" key={key}><span>{label}</span><div className="jic-prayer-times"><strong>{shortTime(todaysTimes?.[key])}</strong>{jamaahKey&&<small><b>J</b>{shortTime(todaysTimes?.[jamaahKey])}</small>}</div></div>)}</div>
          <div className="jic-utility-row"><Link to="/prayer-times/jummah" className="jic-jummah-mini" aria-label="Friday Jummah times"><span>JUMMAH</span><strong>{jummahTimes.map(t=>shortTime(t.prayer)).join(' · ') || '—'}</strong></Link><button type="button" className={cn('jic-radio',playing&&'is-live')} onClick={toggleRadio}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>JIC Radio</span><i className="live-dot"/><small>{radioError?'Retry':'Live'}</small></button></div>
        </div>

        <div className="jic-mainnav mt-2">
          {!scrolled && <Link to="/" className="jic-brand" aria-label="Jamatia Islamic Centre home"><JamatiaLogo/></Link>}
          {scrolled && <AnimatePresence mode="wait"><motion.button type="button" key={reminderIndex} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.22}} className={cn('jic-scroll-reminder',reminderLong&&'is-expandable')} aria-live="polite" aria-expanded={reminderLong?reminderOpen:undefined} onClick={toggleReminder}><div className="jic-reminder-meta"><span>{hijriDate}</span><b>{reminder.type}</b></div><div className="jic-reminder-line"><strong>{reminder.text}</strong><small>{reminder.source}</small>{reminderLong&&<em>Read more</em>}</div></motion.button></AnimatePresence>}
          <div className="jic-nav-cluster" onMouseLeave={()=>setMegaOpen(null)}>
            <nav className="jic-desktop-nav">{NAV_GROUPS.map(({name,path,children})=><NavLink key={path} to={path} end={path==='/'} onMouseEnter={()=>setMegaOpen(children.length?name:null)} onFocus={()=>setMegaOpen(children.length?name:null)} onClick={()=>setMegaOpen(children.length?name:null)} className={({isActive})=>cn('nav-pill',isActive&&'active')}>{name}{children.length>0&&<ChevronDown size={13}/>}</NavLink>)}</nav>
            <AnimatePresence>{openMegaGroup?.children?.length>0&&<motion.div initial={{opacity:0,y:-6,scale:.985}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:.985}} className="jic-mega-menu jic-mega-single jic-glass" onMouseEnter={()=>setMegaOpen(openMegaGroup.name)}><div className="jic-mega-single-head"><Link to={openMegaGroup.path} className="jic-mega-heading">{openMegaGroup.name}</Link><span>{openMegaGroup.children[0]?.name||`Explore ${openMegaGroup.name}`}</span></div><div className="jic-mega-single-links">{openMegaGroup.children.filter(child=>child.path!==openMegaGroup.path).map(child=><Link key={`${openMegaGroup.name}-${child.name}`} to={child.path}>{child.name}</Link>)}</div></motion.div>}</AnimatePresence>
          </div>
          <div className="jic-nav-actions"><Link to="/admin/login" className="header-icon jic-admin-entry" aria-label="Admin login" title="Admin"><LogIn size={18}/></Link><div className="jic-settings-wrap"><button type="button" className="header-icon" onClick={openSettings} aria-label="Settings" title="Settings"><Settings2 size={18}/></button><AnimatePresence>{settingsOpen&&<motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}><SettingsPanel/></motion.div>}</AnimatePresence></div><button type="button" onClick={openDonation} className="donate-button" aria-label="Donate to Jamatia Islamic Centre"><Heart size={18}/><span>Donate</span></button><button type="button" className="header-icon" onClick={openMenu} aria-label="Menu">{menuOpen?<X size={23}/>:<Menu size={23}/>}</button></div>
        </div>

        {subnavItems.length>0&&<nav className="jic-subnav" aria-label={`${subnavLabel} sections`}>{subnavItems.map(item=>{const current=isCurrentSubtab(pathname,item.path);return <Link key={`${subnavLabel}-${item.name}`} to={item.path} aria-current={current?'page':undefined} className={cn('jic-subnav-link',current&&'is-current')}>{item.name}</Link>;})}</nav>}

        <AnimatePresence>{reminderOpen&&reminderLong&&<motion.div initial={{opacity:0,y:-6,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-6,scale:.98}} className="jic-reminder-detail jic-glass" role="dialog" aria-label={`${reminder.type} reminder`}><button type="button" className="jic-reminder-close" onClick={()=>setReminderOpen(false)} aria-label="Close reminder"><X size={18}/></button><div className="jic-reminder-detail-meta"><span>{hijriDate}</span><b>{reminder.type}</b></div><p>{reminder.text}</p><small>{reminder.source}</small></motion.div>}</AnimatePresence>

        <AnimatePresence>{menuOpen&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="jic-mobile-menu jic-glass"><div className="jic-menu-head"><span className="jic-menu-title">Menu</span><button type="button" onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={22}/></button></div><div className="jic-menu-scroll">{NAV_GROUPS.map(({name,path,children})=><div className="jic-menu-group" key={path}><div className="jic-menu-row"><NavLink to={path} end={path==='/'} onClick={()=>!children.length&&setMenuOpen(false)} className={({isActive})=>cn('jic-menu-link',isActive&&'active')}>{name}</NavLink>{children.length>0&&<button type="button" className="jic-menu-expand" onClick={()=>setMobileGroup(mobileGroup===name?null:name)} aria-label={`Toggle ${name} links`}><ChevronDown size={17} className={cn(mobileGroup===name&&'is-open')}/></button>}</div><AnimatePresence>{children.length>0&&mobileGroup===name&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="jic-menu-children">{children.filter(child=>child.path!==path).map(child=><Link key={`${name}-${child.name}`} to={child.path} onClick={()=>setMenuOpen(false)}>{child.name}</Link>)}</motion.div>}</AnimatePresence></div>)}<div className="jic-menu-settings"><strong>Settings</strong><button type="button" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Moon size={16}/>:<Sun size={16}/>} Appearance <span>{theme==='dark'?'Dark':'Light'}</span></button><button type="button" onClick={()=>setGlass(v=>!v)}><Settings2 size={16}/> Glass effects <span>{glass?'On':'Off'}</span></button><label className="jic-menu-opacity"><span>Transparency</span><input type="range" min="45" max="92" value={glassOpacity} disabled={!glass} onChange={e=>setGlassOpacity(Number(e.target.value))}/><b>{glassOpacity}%</b></label></div><Link to="/admin/login" onClick={()=>setMenuOpen(false)} className="jic-menu-admin"><LogIn size={17}/> Admin login</Link><button type="button" onClick={openDonation} className="jic-menu-donate"><Heart size={18}/> Donate</button></div></motion.div>}</AnimatePresence>
      </div>
    </header>
    <WonderfulDonationModal open={donationOpen} onClose={()=>setDonationOpen(false)} />
  </>;
}
