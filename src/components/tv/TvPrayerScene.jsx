import React, { useEffect, useRef, useState } from 'react';
import { TV_DHIKR } from '@/content/tvReminders';
import { countdownParts } from '@/lib/tvCountdown';
export default function TvPrayerScene({ sequence, jummahNotice, settings = {} }) {
  if (sequence.phase === 'before')
    return (
      <section
        className="jic-tv-prayer-scene has-countdown"
        aria-label="Upcoming congregation notice"
      >
        <p className="jic-tv-scene-label">
          {sequence.name} · {sequence.time}
        </p>
        <h1>
          {!settings.before_jamaah_message ||
          settings.before_jamaah_message === 'Jama‘ah begins in 1 minute'
            ? 'Jama‘ah begins shortly'
            : settings.before_jamaah_message}
        </h1>
        <p className="tv-iqamah-countdown" aria-label="Time until jama’ah">
          {countdownParts(sequence.secondsToJamaah).slice(1).join(':')}
        </p>
        <p>Please finish conversations and prepare for salah.</p>
      </section>
    );
  if (sequence.phase === 'jamaah')
    return (
      <section className="jic-tv-prayer-scene" aria-label="Congregation notice">
        <p className="jic-tv-scene-label">
          {sequence.name} · {sequence.time}
        </p>
        <h1>
          {sequence.key === 'jummah'
            ? 'Jumu‘ah congregation'
            : settings.jamaah_message || 'It is Jama‘ah time'}
        </h1>
        <p>{settings.jamaah_submessage || 'Please switch off or silence your phone.'}</p>
        <p>
          {sequence.key === 'jummah'
            ? jummahNotice
            : 'Keep the prayer hall quiet and prepare for salah.'}
        </p>
      </section>
    );
  return <DhikrImage />;
}

function DhikrImage() {
  const frame = useRef(null);
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const element = frame.current;
    const measure = () => setPortrait(element.clientHeight > element.clientWidth);
    measure();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  return (
    <section ref={frame} className="tv-dhikr tv-dhikr-image" aria-label={TV_DHIKR.title}>
      <img
        src={`/tv/after-salah-${portrait ? 'portrait' : 'landscape'}.png`}
        alt="Adhkar after salah, including Ayat al-Kursi and repetition counts"
      />
      <div className="sr-only" lang="ar" dir="rtl">
        <h1>{TV_DHIKR.title}</h1>
        <p>{TV_DHIKR.forgiveness.arabic} × ٣</p>
        <p>{TV_DHIKR.peace}</p>
        <p>{TV_DHIKR.tawhid}</p>
        <p>{TV_DHIKR.generosity}</p>
        <p>{TV_DHIKR.kursi.arabic}</p>
        {TV_DHIKR.tasbih.map((item) => (
          <p key={item.arabic}>{item.arabic} × ٣٣</p>
        ))}
        <p>{TV_DHIKR.completion.arabic} × ١</p>
      </div>
    </section>
  );
}
