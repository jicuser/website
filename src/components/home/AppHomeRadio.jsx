import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Radio } from 'lucide-react';
import { SITE } from '@/content/site';
import { useRadioAvailability } from '@/hooks/useRadioAvailability';
import { updateRadioMediaSession, clearRadioMediaSession } from '@/lib/radioMediaSession';

export default function AppHomeRadio() {
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
  return (
    <section className="jic-app-radio" aria-label="JIC Radio">
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
        aria-label={
          waiting ? 'Cancel radio connection' : playing ? 'Pause JIC Radio' : 'Play JIC Radio'
        }
      >
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>
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
    </section>
  );
}
