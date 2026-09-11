import React from 'react';
import { TV_DHIKR } from '@/content/tvReminders';
export default function TvPrayerScene({ sequence, jummahNotice }) {
  if (sequence.phase === 'jamaah')
    return (
      <section className="jic-tv-prayer-scene" aria-label="Congregation notice">
        <p className="jic-tv-scene-label">
          {sequence.name} · {sequence.time}
        </p>
        <h1>{sequence.key === 'jummah' ? 'Jumu‘ah congregation' : 'It is Jama‘ah time'}</h1>
        <p>Please switch off or silence your phone.</p>
        <p>
          {sequence.key === 'jummah'
            ? jummahNotice
            : 'Keep the prayer hall quiet and prepare for salah.'}
        </p>
      </section>
    );
  const slide = TV_DHIKR[Math.floor(sequence.dhikrSeconds / 40) % TV_DHIKR.length];
  return (
    <section className="jic-tv-prayer-scene" aria-label="Dhikr after prayer">
      <p className="jic-tv-scene-label">
        {slide.title} · {slide.reference}
      </p>
      <p className="jic-tv-arabic" lang="ar" dir="rtl">
        {slide.arabic}
      </p>
      {slide.meaning && <p>{slide.meaning}</p>}
      <p className="jic-tv-scene-label">Take a moment for dhikr and du‘a.</p>
    </section>
  );
}
