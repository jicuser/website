import React, { forwardRef, useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { headerTickerItems } from '@/lib/headerTicker';

const MobileInfoBanner = forwardRef(function MobileInfoBanner(
  { next, jummahTimes, notices, radio },
  ref,
) {
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const items = headerTickerItems(next, jummahTimes, notices);
  const moving = !paused && !reducedMotion;
  const duration = Math.max(
    24,
    items.reduce((sum, item) => sum + item.label.length + item.text.length, 0) / 4,
  );
  const messages = items.map((item, index) => (
    <li key={index}>
      <b>{item.label}</b>
      <span>{item.text}</span>
    </li>
  ));

  return (
    <aside ref={ref} className="jic-mobile-info-banner" aria-label="Community updates">
      <button
        type="button"
        className="jic-ticker-motion"
        aria-label={moving ? 'Pause rolling updates' : 'Resume rolling updates'}
        onClick={() => setPaused((value) => !value)}
        hidden={reducedMotion}
      >
        {moving ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
      </button>
      <div
        className={`jic-ticker-window${moving ? ' is-rolling' : ''}`}
        tabIndex={0}
        role="region"
        aria-label="Prayer times and announcements. Pause to scroll through updates."
        onFocus={() => setPaused(true)}
      >
        <div className="jic-ticker-track" style={{ '--ticker-duration': `${duration}s` }}>
          <ul>{messages}</ul>
          {moving && <ul aria-hidden="true">{messages}</ul>}
        </div>
      </div>
      {radio}
    </aside>
  );
});

export default MobileInfoBanner;
