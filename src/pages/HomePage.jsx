import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Play, Radio, Users, Building2, ArrowRight, Megaphone } from 'lucide-react';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';
import MosqueIcon from '@/components/icons/MosqueIcon';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import useCommunityLink from '@/hooks/useCommunityLink';
import ProgrammePosters from '@/components/ProgrammePosters';
import { SITE } from '@/content/site';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { useContent } from '@/context/ContentContext';
import { supabase } from '@/lib/supabaseClient';
import { londonDate } from '@/lib/timetable';
import { cn } from '@/lib/utils';

function safeWebUrl(raw) {
  try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
}
function youtubeEmbedUrl(raw) {
  try {
    const u = new URL(raw);
    if(u.protocol !== 'https:' || !['youtu.be','youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) return null;
    const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || (/^\/(?:live|embed)\//.test(u.pathname) ? u.pathname.split('/')[2] : null);
    return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? `https://www.youtube.com/embed/${id}` : null;
  } catch { return null; }
}

function useHomeLiveContent(){
  const [events,setEvents]=useState([]);const [announcement,setAnnouncement]=useState(null);const [livestream,setLivestream]=useState(null);
  useEffect(()=>{const now=new Date().toISOString();const today=londonDate();Promise.all([
    supabase.from('events').select('*').eq('published',true).gte('event_date',today).order('event_date',{ascending:true}).limit(4),
    supabase.from('announcements').select('*').eq('published',true).lte('starts_at',now).order('created_at',{ascending:false}).limit(6),
    supabase.from('livestream_settings').select('*').eq('id',1).maybeSingle(),
  ]).then(([e,a,l])=>{if(!e.error)setEvents(e.data||[]);if(!a.error)setAnnouncement((a.data||[]).find(x=>!x.expires_at||x.expires_at>now)||null);if(!l.error)setLivestream(l.data||null);});},[]);
  return{events,announcement,livestream};
}

const DEFAULT_CARDS=[
  {key:'services',title:'Services',text:'Religious, educational and community services for all.',to:'/services',cta:'Explore Services',icon:MosqueIcon,img:''},
  {key:'projects',title:'Masjid Building Works',text:'Follow the latest building works, appeals and progress at JIC.',to:'/projects',cta:'View & Support the Works',icon:Building2,img:''},
  {key:'youth',title:'Youth',text:'Activities, programs and opportunities.',to:'/youth',cta:'Explore Youth',icon:Users,img:''},
  {key:'madrassah',title:'Madrassah',text:'Islamic education for the next generation.',to:'/madrassah',cta:'View Classes',icon:BookOpen,img:''},
];

function useHomeTiles(){
  const[cards,setCards]=useState(DEFAULT_CARDS);
  useEffect(()=>{supabase.from('page_content').select('content_value').eq('content_key','home_tiles').maybeSingle().then(({data,error})=>{if(error||!data?.content_value)return;try{const saved=JSON.parse(data.content_value);if(!Array.isArray(saved))return;setCards(DEFAULT_CARDS.map(base=>{const edit=saved.find(item=>item.key===base.key);if(!edit)return base;return{...base,title:base.key==='projects' && edit.title==='Projects' ? base.title : edit.title||base.title,text:edit.text||base.text,img:typeof edit.image==='string'?edit.image:base.img};}));}catch{}});},[]);
  return cards;
}

export default function HomePage(){
  const{events,announcement,livestream}=useHomeLiveContent();const whatsapp=useCommunityLink();const cards=useHomeTiles();const{jummahTimes}=usePrayerTimes();const{getContent}=useContent();
  let hero={};try{hero=JSON.parse(getContent('page:/','{}'));}catch{}
  const liveUrl=safeWebUrl(livestream?.stream_url)||SITE.socials.youtube;const embedUrl=useMemo(()=>youtubeEmbedUrl(livestream?.stream_url),[livestream]);

  return <div className="jic-premium-home">
    <section className="jic-hero">
      <div className="jic-hero-overlay"/>
      <div className="jic-hero-inner">
        <div className="jic-hero-mobile-logo"><JamatiaLogo/></div>
        <p className="jic-kicker">JAMATIA ISLAMIC CENTRE · BIRMINGHAM</p>
        <h1 style={{whiteSpace:'pre-line'}}>{hero.title||'A place for faith.\nA home for community.'}</h1>
        <div className="jic-gold-rule"/>
        <p className="jic-hero-sub" style={{whiteSpace:'pre-line'}}>{hero.body||'Worship. Learn. Grow. Together.\nA stronger community for a brighter tomorrow.'}</p>
        <div className="jic-hero-buttons"><Link to="/contact#map" className="jic-primary-cta">Visit the Centre <ArrowRight size={18}/></Link><a href={liveUrl} target="_blank" rel="noreferrer" className="jic-secondary-cta jic-watch-live"><Play size={17} fill="currentColor"/> Watch Live</a></div>
      </div>
    </section>

    {announcement&&<section className="jic-announcement jic-popup-surface"><Megaphone size={18}/><strong>{announcement.title}</strong><span>{announcement.body}</span></section>}

    <section className="jic-feature-grid">
      {cards.map(({key,title,text,to,cta,icon:Icon,img})=><Link to={to} className={cn('jic-feature-card',!img&&'is-glass-only')} key={key} style={img?{'--card-image':`url("${img}")`}:undefined}>
        <Icon className="jic-card-icon"/><div className="jic-card-copy"><h2>{title}</h2><p>{text}</p><span>{cta} <ArrowRight size={17}/></span></div>
      </Link>)}
    </section>

    <ProgrammePosters />

    {events.length > 0 && <section className="jic-upcoming-events" aria-labelledby="upcoming-events-title">
      <h2 id="upcoming-events-title">Upcoming events</h2>
      <div className="jic-event-cards">{events.map(event => <article key={event.id} className="jic-event-card">
        {safeWebUrl(event.poster_url) && <img src={event.poster_url} alt={`${event.title} poster`} loading="lazy"/>}
        <h3>{event.title}</h3>
        <p><time dateTime={event.event_date}>{new Date(`${event.event_date}T12:00:00`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</time>{event.start_time ? ` · ${event.start_time.slice(0,5)}` : ''}</p>
        {event.location && <p>{event.location}</p>}
        {event.description && <p>{event.description}</p>}
        {safeWebUrl(event.registration_url) && <a href={safeWebUrl(event.registration_url)} target="_blank" rel="noreferrer">Event details & registration</a>}
      </article>)}</div>
    </section>}

    <section className="jic-event-strip"><div className="jic-event-label"><CalendarDays size={17}/><span>Friday Sermon</span></div><div className="jic-event-main"><strong>{jummahTimes.map((t,i)=>`${i===0?'1st':'2nd'} Jamaat ${t.prayer}`).join(' · ')}</strong><span>Every Friday</span></div><Link to="/prayer-times/jummah" className="jic-event-arrow">›</Link></section>

    {livestream?.enabled&&livestream.stream_url&&<section id="live" className="jic-live-section"><div className="jic-live-heading"><span><Radio size={15}/> Live</span><h2>{livestream.title||'JIC Live'}</h2></div>{embedUrl?<div className="jic-live-frame"><iframe src={embedUrl} title={livestream.title||'JIC Live'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/></div>:<a className="jic-primary-cta jic-watch-live" href={liveUrl} target="_blank" rel="noreferrer">Watch Live on YouTube</a>}</section>}

    <section className="jic-home-footer-strip"><div><WhatsAppIcon size={24}/><div><strong>Join our WhatsApp Community</strong><small>Official JIC updates and announcements</small></div></div><a className="jic-community-join" href={whatsapp}>Join WhatsApp <ArrowRight size={17}/></a></section>
  </div>;
}
