import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import PublicBackdrop from '@/components/shell/PublicBackdrop';
import { SITE } from '@/content/site';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

export default function RadioPlayerPage() {
  const audioRef = useRef(null);
  const [error, setError] = useState(false);
  const streamUrl = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const availability = useRadioAvailability(streamUrl);
  useEffect(() => {
    const title = document.title;
    document.title = 'JIC Radio · Jamatia Islamic Centre';
    const audio = audioRef.current;
    return () => { audio?.pause(); clearRadioMediaSession(); document.title = title; };
  }, []);
  return <main className="jic-radio-player-page jic-public-route jic-inner-route">
    <PublicBackdrop />
    <section className="jic-radio-player-panel">
      <Link to="/" className="jic-player-logo" aria-label="Jamatia Islamic Centre home"><JamatiaLogo/></Link>
      <img src="/icons/jic-icon-512.png?v=stone-glass-1" width="160" height="160" className="jic-player-artwork" alt="Jamatia Islamic Centre entrance"/>
      <h1>JIC Radio</h1>
      <p className="jic-player-status" data-availability={availability}><i aria-hidden="true"/>{availability === 'online' ? 'Station online' : availability === 'offline' ? 'Station offline' : availability === 'checking' ? 'Checking station…' : 'Station status unavailable'}</p>
      <audio ref={audioRef} src={streamUrl || undefined} controls preload="none" playsInline aria-label="JIC Radio player" onPlaying={() => { setError(false); updateRadioMediaSession(audioRef.current); }} onPause={() => updateRadioMediaSession(audioRef.current)} onError={() => setError(true)}/>
      {error && <p role="alert">The stream is unavailable. Please try Play again later.</p>}
      <Link to="/">Return to the website</Link>
    </section>
  </main>;
}
