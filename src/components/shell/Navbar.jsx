import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, MapPin, Menu, Moon, Pause, Play, Sun, X, ChevronDown, LogIn, Phone } from 'lucide-react';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import WonderfulDonationModal from '@/components/donations/WonderfulDonationModal';
import { NAV_GROUPS } from '@/content/nav';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { cn } from '@/lib/utils';

const PRAYERS = [['Fajr','fajr'],['Sunrise','sunrise'],['Dhuhr','dhuhr'],['Asr','asr'],['Maghrib','maghrib'],['Isha','isha']];
const shortTime = v => v && v !== 'N/A' ? String(v).replace(/^0/,'').replace(/\s?[AP]M$/i,'') : '—';
const safeGet=(key,fallback)=>{try{return window.localStorage.getItem(key)??fallback;}catch{return fallback;}};
const safeSet=(key,value)=>{try{window.localStorage.setItem(key,value);}catch{}};
const getActiveGroup=(pathname)=>{
  if(['/team','/contact','/financial-history'].includes(pathname)) return NAV_GROUPS.find(x=>x.name==='About');
  return NAV_GROUPS.find(group=>group.path==='/'?pathname==='/':pathname===group.path||pathname.startsWith(`${group.path}/`));
};
const isCurrentSubtab=(pathname,itemPath)=> pathname===itemPath || (itemPath!=='/' && pathname.startsWith(`${itemPath}/`));

const REMINDERS = [
  {type:'Qur’an',text:'Indeed, with hardship will be ease.',source:'94:6'},
  {type:'Qur’an',text:'Indeed, Allah is with the patient.',source:'2:153'},
  {type:'Qur’an',text:'In the remembrance of Allah do hearts find rest.',source:'13:28'},
  {type:'Qur’an',text:'Do not despair of the mercy of Allah.',source:'39:53'},
  {type:'Hadith',text:'Actions are judged by intentions.',source:'Bukhari 1 · Muslim 1907'},
  {type:'Hadith',text:'A good word is charity.',source:'Bukhari 2989 · Muslim 1009'},
  {type:'Hadith',text:'Allah is gentle and loves gentleness.',source:'Bukhari 6024 · Muslim 2165'},
  {type:'History',text:'The Hijri calendar begins from the Prophet’s ﷺ migration from Makkah to Madinah.',source:'Islamic history'},
  {type:'History',text:'The first qiblah of the Muslims was toward Bayt al-Maqdis in Jerusalem.',source:'Islamic history'},
  {type:'Reflection',text:'Make today better with one prayer, one kindness and one sincere du‘a.',source:'Daily reminder'},
];

function daySeed(){
  const now=new Date();
  const start=new Date(now.getFullYear(),0,0);
  return Math.floor((now-start)/86400000);
}

function getHijriDate(){
  try{
    return new Intl.DateTimeFormat('en-GB-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric'}).format(new Date()).replace(' AH',' AH');
  }catch{
    return '';
  }
}

export default function Navbar(){
  const {pathname}=useLocation();
  const {todaysTimes,jummahTimes}=usePrayerTimes();
  const [menuOpen,setMenuOpen]=useState(false);
  const [megaOpen,setMegaOpen]=useState(false);
  const [mobileGroup,setMobileGroup]=useState(null);
  const [theme,setTheme]=useState(()=>safeGet('jic-theme','dark'));
  const [glass,setGlass]=useState(()=>safeGet('jic-glass','on')!=='off');
  const [playing,setPlaying]=useState(false);
  const [radioError,setRadioError]=useState(false);
  const [scrolled,setScrolled]=useState(false);
  const [reminderIndex,setReminderIndex]=useState(()=>daySeed()%REMINDERS.length);
  const [donationOpen,setDonationOpen]=useState(false);
  const audioRef=useRef(null);
  const scrolledRef=useRef(false);
  const streamUrl=import.meta.env.VITE_RADIO_STREAM_URL||SITE.radio?.streamUrl||'';
  const activeGroup=useMemo(()=>getActiveGroup(pathname),[pathname]);
  const megaGroups=NAV_GROUPS.filter(group=>!['Home','Prayer Times'].includes(group.name));
  const reminder=REMINDERS[reminderIndex%REMINDERS.length];
  const hijriDate=useMemo(()=>getHijriDate(),[]);

  useEffect(()=>{document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.dataset.surface=glass?'glass':'solid';safeSet('jic-theme',theme);safeSet('jic-glass',glass?'on':'off');},[theme,glass]);
  useEffect(()=>{
    const onScroll=()=>{
      const next=window.scrollY>48;
      if(next && !scrolledRef.current) setReminderIndex(i=>(i+1)%REMINDERS.length);
      scrolledRef.current=next;
      setScrolled(next);
    };
    onScroll();
    window.addEventListener('scroll',onScroll,{passive:true});
    return()=>window.removeEventListener('scroll',onScroll);
  },[]);
  useEffect(()=>{
    if(!scrolled)return;
    const timer=window.setInterval(()=>setReminderIndex(i=>(i+1)%REMINDERS.length),300000);
    return()=>window.clearInterval(timer);
  },[scrolled]);
  useEffect(()=>()=>{if(audioRef.current){audioRef.current.pause();audioRef.current.src='';}},[]);
  useEffect(()=>{setMenuOpen(false);setMegaOpen(false);setMobileGroup(null);},[pathname]);

  const toggleRadio=async()=>{
    if(!streamUrl)return;
    if(!audioRef.current){audioRef.current=new Audio(streamUrl);audioRef.current.preload='none';audioRef.current.addEventListener('playing',()=>{setPlaying(true);setRadioError(false);});audioRef.current.addEventListener('pause',()=>setPlaying(false));audioRef.current.addEventListener('error',()=>{setPlaying(false);setRadioError(true);});}
    try{playing?audioRef.current.pause():await audioRef.current.play();}catch{setPlaying(false);setRadioError(true);}
  };

  const openDonation=()=>{setMenuOpen(false);setMegaOpen(false);setDonationOpen(true);};

  return <>
    <header className={cn('jic-header fixed inset-x-0 top-0 z-50',scrolled&&'is-scrolled')}>
      <div className="mx-auto max-w-[1500px] px-2 sm:px-4 pt-2">
        <div className="jic-glass jic-info-shell overflow-hidden">
          <div className="jic-address"><MapPin size={15}/><span>Woodlands Rd · Birmingham · B11 4ER</span><a className="jic-top-phone" href={`tel:${SITE.phone.replace(/\s/g,'')}`}><Phone size={13}/><span>{SITE.phone}</span></a></div>
          <div className="jic-prayer-row">{PRAYERS.map(([label,key])=><div className="jic-prayer" key={key}><span>{label}</span><strong>{shortTime(todaysTimes?.[key])}</strong></div>)}</div>
          <div className="jic-utility-row">
            <Link to="/prayer-times/jummah" className="jic-jummah-mini" aria-label="Friday Jummah times"><span>FRI</span><strong>{jummahTimes.map(t=>shortTime(t.prayer)).join(' · ') || '—'}</strong></Link>
            <button className={cn('jic-radio',playing&&'is-live')} onClick={toggleRadio}>{playing?<Pause size={15}/>:<Play size={15}/>}<span>JIC Radio</span><i className="live-dot"/><small>{radioError?'Retry':'Live'}</small></button>
            <div className="jic-display-controls"><button onClick={()=>setTheme(theme==='dark'?'light':'dark')} aria-label="Toggle colour theme">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button><button onClick={()=>setGlass(v=>!v)}><span className={cn('glass-switch',glass&&'on')}><i/></span><span>Glass {glass?'On':'Off'}</span></button></div>
          </div>
        </div>

        <div className="jic-mainnav mt-2">
          {!scrolled && <Link to="/" className="jic-brand" aria-label="Jamatia Islamic Centre home"><JamatiaLogo/></Link>}
          {scrolled && <AnimatePresence mode="wait"><motion.div key={reminderIndex} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.22}} className="jic-scroll-reminder" aria-live="polite">
            <div className="jic-reminder-meta"><span>{hijriDate}</span><b>{reminder.type}</b></div>
            <div className="jic-reminder-line"><strong>{reminder.text}</strong><small>{reminder.source}</small></div>
          </motion.div></AnimatePresence>}
          <div className="jic-nav-cluster" onMouseLeave={()=>setMegaOpen(false)}>
            <nav className="jic-desktop-nav">{NAV_GROUPS.map(({name,path,children})=><NavLink key={path} to={path} end={path==='/'} onMouseEnter={()=>children.length&&setMegaOpen(true)} onFocus={()=>children.length&&setMegaOpen(true)} className={({isActive})=>cn('nav-pill',isActive&&'active')}>{name}{children.length>0&&<ChevronDown size={13}/>}</NavLink>)}</nav>
            <AnimatePresence>{megaOpen&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="jic-mega-menu jic-glass" onMouseEnter={()=>setMegaOpen(true)}>
              {megaGroups.map(group=><div className="jic-mega-column" key={group.name}><Link to={group.path} className="jic-mega-heading">{group.name}</Link>{group.children.filter(child=>child.path!==group.path).map(child=><Link key={`${group.name}-${child.name}`} to={child.path}>{child.name}</Link>)}</div>)}
            </motion.div>}</AnimatePresence>
          </div>
          <div className="jic-nav-actions">
            <Link to="/admin/login" className="header-icon jic-admin-entry" aria-label="Admin login" title="Admin"><LogIn size={18}/></Link>
            <button type="button" onClick={openDonation} className="donate-button" aria-label="Donate to Jamatia Islamic Centre"><Heart size={18}/><span>Donate</span></button>
            <button className="header-icon" onClick={()=>setMenuOpen(v=>!v)} aria-label="Menu">{menuOpen?<X size={23}/>:<Menu size={23}/>}</button>
          </div>
        </div>

        {activeGroup?.children?.length>0&&<nav className="jic-subnav" aria-label={`${activeGroup.name} sections`}>{activeGroup.children.map(item=>{const current=isCurrentSubtab(pathname,item.path);return <Link key={`${activeGroup.name}-${item.name}`} to={item.path} aria-current={current?'page':undefined} className={cn('jic-subnav-link',current&&'is-current')}>{item.name}</Link>;})}</nav>}

        <AnimatePresence>{menuOpen&&<motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="jic-mobile-menu jic-glass">
          <div className="jic-menu-head"><span className="jic-menu-title">Menu</span><button onClick={()=>setMenuOpen(false)} aria-label="Close menu"><X size={22}/></button></div>
          <div className="jic-menu-scroll">{NAV_GROUPS.map(({name,path,children})=><div className="jic-menu-group" key={path}>
            <div className="jic-menu-row"><NavLink to={path} end={path==='/'} onClick={()=>!children.length&&setMenuOpen(false)} className={({isActive})=>cn('jic-menu-link',isActive&&'active')}>{name}</NavLink>{children.length>0&&<button className="jic-menu-expand" onClick={()=>setMobileGroup(mobileGroup===name?null:name)} aria-label={`Toggle ${name} links`}><ChevronDown size={17} className={cn(mobileGroup===name&&'is-open')}/></button>}</div>
            <AnimatePresence>{children.length>0&&mobileGroup===name&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="jic-menu-children">{children.filter(child=>child.path!==path).map(child=><Link key={`${name}-${child.name}`} to={child.path} onClick={()=>setMenuOpen(false)}>{child.name}</Link>)}</motion.div>}</AnimatePresence>
          </div>)}<Link to="/admin/login" onClick={()=>setMenuOpen(false)} className="jic-menu-admin"><LogIn size={17}/> Admin login</Link><button type="button" onClick={openDonation} className="jic-menu-donate"><Heart size={18}/> Donate</button></div>
        </motion.div>}</AnimatePresence>
      </div>
    </header>
    <WonderfulDonationModal open={donationOpen} onClose={()=>setDonationOpen(false)} />
  </>;
}
