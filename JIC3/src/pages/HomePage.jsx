/**
 * Home page — all text comes from src/content/pages/home.js
 * To change any copy or events: edit that file, not this one.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Users, Calendar, Clock, Heart, BookOpen, Loader2, Radio, Megaphone } from 'lucide-react';
import MosqueIcon from '@/components/icons/MosqueIcon';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { HERO, PRAYER_STRIP, SERVICES_SECTION, SERVICES_LIST, EVENTS_SECTION, EVENTS_LIST, CTA } from '@/content/pages/home';
import { IMAGES } from '@/content/images';
import { supabase } from '@/lib/supabaseClient';

// Maps icon key strings (from content file) → actual components
const ICON_MAP = {
  mosque:   MosqueIcon,
  book:     Book,
  users:    Users,
  calendar: Calendar,
  bookOpen: BookOpen,
  heart:    Heart,
};


function youtubeEmbedUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.hostname === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)) {
      const id = u.searchParams.get('v') || (u.pathname.startsWith('/live/') ? u.pathname.split('/')[2] : null);
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return raw;
    }
  } catch (_) {}
  return null;
}

function useHomeLiveContent() {
  const [events, setEvents] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
  const [livestream, setLivestream] = useState(null);
  useEffect(() => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    Promise.all([
      supabase.from('events').select('*').eq('published', true).gte('event_date', today).order('featured', { ascending: false }).order('event_date', { ascending: true }).limit(6),
      supabase.from('announcements').select('*').eq('published', true).lte('starts_at', now).order('created_at', { ascending: false }).limit(10),
      supabase.from('livestream_settings').select('*').eq('id', 1).maybeSingle(),
    ]).then(([e,a,l]) => {
      if (!e.error) setEvents(e.data || []);
      if (!a.error) setAnnouncement((a.data || []).find(x => !x.expires_at || x.expires_at > now) || null);
      if (!l.error) setLivestream(l.data || null);
    });
  }, []);
  return { events, announcement, livestream };
}

const PRAYER_KEYS = [
  { name: 'Fajr',    begins: 'fajr',    jamaah: 'jamaah_fajr' },
  { name: 'Dhuhr',   begins: 'dhuhr',   jamaah: 'jamaah_dhuhr' },
  { name: 'Asr',     begins: 'asr',     jamaah: 'jamaah_asr' },
  { name: 'Maghrib', begins: 'maghrib', jamaah: 'jamaah_maghrib' },
  { name: 'Isha',    begins: 'isha',    jamaah: 'jamaah_isha' },
];

export default function HomePage() {
  const { todaysTimes, isLoadingPrayerTimes } = usePrayerTimes();
  const { events, announcement, livestream } = useHomeLiveContent();
  const eventCards = events.length ? events : EVENTS_LIST.map((ev, i) => ({ id: `fallback-${i}`, title: ev.title, description: ev.description, displayDate: ev.date }));
  const embedUrl = useMemo(() => youtubeEmbedUrl(livestream?.stream_url), [livestream]);

  return (
    <div className="page-transition">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="jic-home-hero relative overflow-hidden">
        <img src={IMAGES.homeHero} alt="Jamatia Islamic Centre" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 jic-hero-shade" />
        <div className="relative z-10 container mx-auto px-5 py-20 md:py-28 min-h-[620px] flex items-center">
          <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} className="max-w-2xl text-white">
            <p className="mb-5 text-[11px] md:text-xs tracking-[.32em] uppercase text-white/75">Jamatia Islamic Centre · Birmingham</p>
            <h1 className="jic-display text-5xl sm:text-6xl md:text-7xl leading-[.98] mb-7">A place for faith.<br/><span className="text-white/80">A home for community.</span></h1>
            <div className="h-[3px] w-14 bg-[#d9aa43] mb-7"/>
            <p className="text-base md:text-lg text-white/85 mb-8">Worship. Learn. Grow. Together.<br/>A stronger community for a brighter tomorrow.</p>
            <Button asChild size="lg" className="donate-button !inline-flex"><Link to="/contact">Visit the Centre <span className="ml-2">→</span></Link></Button>
          </motion.div>
        </div>
      </section>

      {announcement && (
        <section className={`${announcement.kind === 'urgent' ? 'bg-red-700' : announcement.kind === 'important' ? 'bg-amber-500' : 'bg-teal-700'} text-white`}>
          <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <Megaphone className="h-5 w-5 shrink-0" />
            <strong>{announcement.title}</strong>
            {announcement.body && <span className="text-sm text-white/90">{announcement.body}</span>}
          </div>
        </section>
      )}

      {/* ── Services ─────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{SERVICES_SECTION.heading}</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{SERVICES_SECTION.subheading}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {SERVICES_LIST.map((svc, i) => {
              const Icon = ICON_MAP[svc.icon];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                  <Card className="h-full hover:shadow-lg transition-all">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                      <div className="mb-4 p-3 rounded-full bg-primary/10">
                        <Icon className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold mb-2">{svc.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{svc.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Button asChild><Link to={SERVICES_SECTION.ctaTo}>{SERVICES_SECTION.ctaLabel}</Link></Button>
          </div>
        </div>
      </section>

      {/* ── Events ───────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{EVENTS_SECTION.heading}</h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">{EVENTS_SECTION.subheading}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {eventCards.map((ev, i) => (
              <motion.div key={ev.id || i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}>
                <Card className="h-full hover:shadow-lg transition-all border-t-4 border-t-primary bg-gray-50 dark:bg-gray-800">
                  <CardContent className="pt-6">
                    <div className="flex items-center mb-4">
                      <Clock className="h-5 w-5 text-primary mr-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{ev.displayDate || new Date(`${ev.event_date}T00:00:00`).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}{ev.start_time ? ` · ${ev.start_time.slice(0,5)}` : ''}</p>
                    </div>
                    <h3 className="text-xl font-bold mb-2">{ev.title}</h3>
                    {ev.poster_url && <img src={ev.poster_url} alt="" className="mb-4 aspect-video w-full rounded-lg object-cover" loading="lazy" />}
                    <p className="text-gray-600 dark:text-gray-300">{ev.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {livestream?.enabled && livestream.stream_url && (
        <section className="py-16 bg-slate-950 text-white">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide"><Radio size={13}/> Live</span>
                <h2 className="text-3xl font-bold">{livestream.title || 'JIC Live'}</h2>
              </div>
              {embedUrl ? (
                <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
                  <iframe className="h-full w-full" src={embedUrl} title={livestream.title || 'JIC livestream'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              ) : (
                <a href={livestream.stream_url} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-white px-5 py-3 font-semibold text-slate-950">Watch livestream</a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{CTA.heading}</h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">{CTA.body}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg"><Link to={CTA.cta1.to}>{CTA.cta1.label}</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to={CTA.cta2.to}>{CTA.cta2.label}</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
