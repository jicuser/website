import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import PublicBackdrop from '@/components/shell/PublicBackdrop';
import YouTubeScreenPlayer from '@/components/tv/YouTubeScreenPlayer';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { useAppearance } from '@/context/AppearanceContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { PROGRAMMES } from '@/content/programmes';
import { safeWebUrl, youtubeVideoId } from '@/lib/video';
import { londonDate } from '@/lib/timetable';

const ROTATE_MS = 20000;

export default function TvDisplayPage() {
  const screen = useRef(null);
  const { theme, toggleTheme } = useAppearance();
  const prayers = usePrayerTimes();
  const { events, livestream, stale } = useHomeLiveContent({ eventLimit:50 });
  const [now, setNow] = useState(() => new Date());
  const [slide, setSlide] = useState(0);
  const [mode, setMode] = useState('auto');
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [failedImages, setFailedImages] = useState([]);
  const [failedVideo, setFailedVideo] = useState('');
  const [message, setMessage] = useState('');
  const today = londonDate();
  const posters = useMemo(() => {
    const programmePosters = PROGRAMMES.map(item => ({ id:item.id, title:item.title, image:item.image, alt:item.alt }));
    const eventPosters = events.filter(event => event.event_date >= today && safeWebUrl(event.poster_url)).map(event => ({ id:`event-${event.id}`, title:event.title, image:event.poster_url, alt:`${event.title} poster` }));
    const seen = new Set();
    return [...programmePosters, ...eventPosters].filter(item => {
      if (seen.has(item.image) || failedImages.includes(item.image)) return false;
      seen.add(item.image);
      return true;
    });
  }, [events, failedImages, today]);
  const videoId = youtubeVideoId(livestream?.stream_url);
  const scheduled = livestream?.scheduled_at ? new Date(livestream.scheduled_at).getTime() : null;
  const liveAvailable = Boolean(livestream?.enabled && videoId && (!scheduled || scheduled <= now.getTime()));
  const showLive = mode !== 'posters' && liveAvailable && failedVideo !== videoId;
  const visiblePosters = posters.length ? [posters[slide % posters.length], ...(posters.length > 1 && !showLive ? [posters[(slide + 1) % posters.length]] : [])] : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (posters.length < 2) return undefined;
    const timer = window.setInterval(() => setSlide(index => (index + 1) % posters.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [posters.length]);
  useEffect(() => {
    setFailedVideo('');
    setMessage('');
  }, [videoId, livestream?.enabled]);
  useEffect(() => {
    let timer;
    const reveal = () => {
      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 8000);
    };
    const syncFullscreen = () => setFullscreen(document.fullscreenElement === screen.current);
    reveal();
    window.addEventListener('pointermove', reveal, { passive:true });
    window.addEventListener('pointerdown', reveal, { passive:true });
    window.addEventListener('keydown', reveal);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', reveal);
      window.removeEventListener('pointerdown', reveal);
      window.removeEventListener('keydown', reveal);
      document.removeEventListener('fullscreenchange', syncFullscreen);
    };
  }, []);
  useEffect(() => {
    let active = true;
    let lock;
    const keepAwake = async () => {
      if (document.visibilityState !== 'visible' || !navigator.wakeLock || lock) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (!active) { await next.release(); return; }
        lock = next;
        next.addEventListener('release', () => { lock = null; });
      } catch { /* TVs without Wake Lock use their own screen timeout setting. */ }
    };
    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    document.addEventListener('fullscreenchange', keepAwake);
    return () => {
      active = false;
      lock?.release().catch(() => {});
      document.removeEventListener('visibilitychange', keepAwake);
      document.removeEventListener('fullscreenchange', keepAwake);
    };
  }, []);

  const onUnavailable = useCallback(reason => { setFailedVideo(videoId); setMessage(reason); }, [videoId]);
  const nextPoster = offset => setSlide(index => (index + offset + posters.length) % Math.max(1, posters.length));
  const changeMode = value => { setMode(value); setFailedVideo(''); setMessage(''); };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (screen.current?.requestFullscreen) await screen.current.requestFullscreen();
      else setMessage('Use your TV browser’s full-screen option.');
    } catch { setMessage('Use your TV browser’s full-screen option.'); }
  };

  return <div ref={screen} className="jic-tv-display jic-public-route jic-inner-route">
    <Helmet><title>JIC · TV Display</title><meta name="robots" content="noindex, nofollow"/></Helmet>
    <PublicBackdrop/>
    <header className="jic-tv-header">
      <div className="jic-tv-heading"><div className="jic-tv-logo"><JamatiaLogo/></div><div className="jic-tv-clock"><time dateTime={now.toISOString()}>{now.toLocaleTimeString('en-GB',{ timeZone:'Europe/London', hour:'2-digit', minute:'2-digit' })}</time><span>{now.toLocaleDateString('en-GB',{ timeZone:'Europe/London', weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span></div></div>
      <PrayerTimeBar {...prayers} currentDate={now} interactive={false} showContact={false}/>
      {(prayers.error || (!prayers.isLoadingPrayerTimes && !prayers.todaysTimes)) && <p className="jic-tv-notice" role="status">Prayer timetable unavailable · reconnecting</p>}
    </header>
    <main className={`jic-tv-stage ${showLive ? 'is-live' : ''}`} aria-label={showLive ? 'Livestream and posters' : 'Community posters'}>
      {showLive && <section className="jic-tv-video"><h1>{livestream.title || 'JIC Livestream'}</h1><YouTubeScreenPlayer videoId={videoId} title={livestream.title} muted={muted} onUnavailable={onUnavailable}/></section>}
      <div className="jic-tv-posters">{visiblePosters.map(item => <figure key={item.id} className="jic-tv-poster"><img src={item.image} alt={item.alt} onError={() => setFailedImages(previous => previous.includes(item.image) ? previous : [...previous,item.image])}/><figcaption>{item.title}</figcaption></figure>)}</div>
      {!posters.length && !showLive && <p className="jic-tv-empty">Posters will appear here when available.</p>}
    </main>
    <div className="jic-tv-status">{stale ? 'Content update delayed · reconnecting' : <span>{showLive ? 'Livestream' : 'Community notices'}{posters.length > 1 && ` · ${slide % posters.length + 1} / ${posters.length}`}</span>}</div>
    <div className={`jic-tv-controls ${controlsVisible ? 'is-visible' : ''}`} aria-label="TV display controls">
      <Link to="/admin">Admin</Link>
      <div className="jic-tv-modes" role="group" aria-label="Display mode">{[['auto','Auto'],['posters','Posters'],['live','Livestream']].map(([value,label]) => <button key={value} type="button" aria-pressed={mode === value} disabled={value === 'live' && !liveAvailable} onClick={() => changeMode(value)}>{label}</button>)}</div>
      <button type="button" onClick={() => nextPoster(-1)} disabled={posters.length < 2} aria-label="Previous poster"><ChevronLeft size={20}/></button>
      <button type="button" onClick={() => nextPoster(1)} disabled={posters.length < 2} aria-label="Next poster"><ChevronRight size={20}/></button>
      <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? 'Enable livestream sound' : 'Mute livestream'} disabled={!showLive}>{muted ? <VolumeX size={20}/> : <Volume2 size={20}/>}</button>
      <button type="button" onClick={toggleTheme} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}</button>
      <button type="button" onClick={toggleFullscreen}>{fullscreen ? <Minimize size={20}/> : <Maximize size={20}/>} {fullscreen ? 'Exit full screen' : 'Full screen'}</button>
      {message && <p role="status">{message} {failedVideo && <button type="button" onClick={() => { setFailedVideo(''); setMessage(''); }}>Retry livestream</button>}</p>}
      {!liveAvailable && <p>{livestream?.enabled && !videoId ? 'Set a YouTube video or livestream link in Admin → Livestream.' : scheduled > now.getTime() ? 'Livestream will appear at its scheduled time.' : 'Enable a stream in Admin → Livestream. Posters refresh automatically.'}</p>}
    </div>
  </div>;
}
