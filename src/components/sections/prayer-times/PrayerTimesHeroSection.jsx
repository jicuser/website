import React from 'react';

export default function PrayerTimesHeroSection({ title = 'Prayer Times', meta = '' }) {
  return (
    <section className="jic-prayer-title mx-auto max-w-4xl px-4">
      {meta && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90 sm:text-xs">
          {meta}
        </p>
      )}
      <h1>{title}</h1>
    </section>
  );
}
