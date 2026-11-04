import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Radio, CassetteTape } from 'lucide-react';
import { SITE } from '@/content/site';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

export default function AppHomeRadio({ compact = false }) {
  const audio = useRef(null);
  const attempt = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const url = import.meta.env.VITE_RADIO_STREAM_URL || SITE.radio?.streamUrl || '';
  const status = useRadioAvailability(url);
  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.pause();
      clearRadioMediaSession();
    };
  }, []);
  async function toggle() {
    if (waiting || !audio.current.paused) {
      attempt.current++;
      audio.current.pause();
      if (waiting) audio.current.load();
      setWaiting(false);
      return;
    }
    const request = ++attempt.current;
    setError('');
    setWaiting(true);
    try {
      await audio.current.play();
    } catch {
      if (request === attempt.current) {
        setWaiting(false);
        setError('Unable to play. Tap to try again.');
      }
    }
  }
  const player = (
    <audio
        ref={audio}
        src={url || undefined}
        preload="none"
        playsInline
        onPlaying={() => {
          setPlaying(true);
          setWaiting(false);
          setError('');
          updateRadioMediaSession(audio.current);
        }}
        onPause={() => {
          setPlaying(false);
          setWaiting(false);
          updateRadioMediaSession(audio.current);
        }}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onError={() => {
          setWaiting(false);
          setPlaying(false);
          setError('Broadcast unavailable. Try again later.');
        }}
      />
  );
  if (compact) {
    return (
      <section className="jic-app-radio-mini" aria-label="JIC Radio" data-playing={playing}>
        <button type="button" onClick={toggle} disabled={!url} aria-pressed={playing}
          aria-label={waiting ? 'Cancel radio connection' : playing ? 'Pause JIC Radio' : 'Play JIC Radio'}>
          <CassetteTape size={23} aria-hidden="true" />
          <span>Radio</span>
          {playing ? <Pause size={11} aria-hidden="true" /> : <Play size={11} aria-hidden="true" />}
        </button>
        <span className="sr-only" role="status">{error || (waiting ? 'Connecting…' : playing ? 'Playing live broadcast' : status === 'offline' ? 'Off air' : 'Tap play to listen')}</span>
        {player}
      </section>
    );
  }
  return (
    <section className="jic-app-radio" aria-label="JIC Radio" data-playing={playing}>
      <span className="jic-app-radio-art">
        <Radio size={24} aria-hidden="true" />
      </span>
      <div>
        <h2>JIC Radio</h2>
        <p role="status">
          {error ||
            (waiting
              ? 'Connecting…'
              : playing
                ? 'Playing live broadcast'
                : status === 'online'
                  ? 'On air · Listen live'
                  : status === 'offline'
                    ? 'Off air'
                    : 'Tap play to listen')}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-pressed={playing}
        aria-label={
          waiting ? 'Cancel radio connection' : playing ? 'Pause JIC Radio' : 'Play JIC Radio'
        }
      >
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>
      <svg className="jic-app-radio-wave" viewBox="0 0 108 28" fill="none" aria-hidden="true">
        <path d="M2 12v4m6-8v12m6-15v18m6-12v6m6-16v26m6-19v12m6-10v8m6-13v18m6-21v24m6-17v10m6-7v4m6-9v14m6-18v22m6-15v8m6-11v14m6-19v24m6-16v8m6-6v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {player}
    </section>
  );
}
