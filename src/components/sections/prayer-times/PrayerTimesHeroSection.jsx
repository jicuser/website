import React from 'react';
import { PRAYER_LOCATION } from '@/lib/pageMetadata';

export default function PrayerTimesHeroSection({ title = 'Prayer Times', meta = '' }) {
  return (
    <section className="jic-prayer-title mx-auto max-w-4xl px-4">
      {meta && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/90 sm:text-xs">
          {meta}
        </p>
      )}
      <h1>{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {PRAYER_LOCATION}
      </p>
    </section>
  );
}
