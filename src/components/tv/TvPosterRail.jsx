import React, { useEffect, useState } from 'react';
import TvMediaPanel from './TvMediaPanel';
import { posterWindow } from '@/lib/posters';

export default function TvPosterRail({ posters, seconds, onImageError }) {
  const [offset, setOffset] = useState(0);
  const [moving, setMoving] = useState(false);
  const slots = Math.min(4, posters.length);
  useEffect(() => {
    if (posters.length < 2) return;
    const timer = setInterval(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        setOffset((index) => (index + 1) % posters.length);
      else setMoving(true);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [posters.length, seconds]);
  useEffect(() => {
    if (!moving) return;
    // A timer also completes a rotation when a background tab skips transition events.
    const timer = setTimeout(() => {
      setOffset((index) => (index + 1) % Math.max(1, posters.length));
      setMoving(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [moving, posters.length]);
  if (!slots) return <div className="jic-tv-empty">No posters selected</div>;
  return (
    <section
      className="tv-poster-rail"
      aria-label="Posters and announcements"
      style={{ '--poster-slots': slots }}
    >
      <div className={`tv-poster-track ${moving ? 'is-moving' : ''}`}>
        {posterWindow(posters, offset, 4, true).map((poster, index) => (
          <div className="tv-poster-slot" key={index} aria-hidden={index >= slots}>
            <TvMediaPanel source="poster" poster={poster} onImageError={onImageError} />
          </div>
        ))}
      </div>
    </section>
  );
}
