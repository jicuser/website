import React from 'react';
import { usePublishedPrayerDetails } from './usePublishedPrayerDetails';
import { displayTime, displayZawal } from '@/lib/timetable';
import './prayer-details.css';
export default function AdditionalPrayerTimes({ date }) {
  const { rows, status } = usePublishedPrayerDetails(date);
  if (!date) return null;
  const row = rows?.get(date);
  const unknown =
    status === 'loading' ? 'Loading…' : status === 'error' ? 'Unavailable' : 'Not published';
  return (
    <section className="additional-prayer-times" aria-label="Additional times">
      <dl>
        <div>
          <dt>Sunset</dt>
          <dd>{row?.sunset ? displayTime(row.sunset) : unknown}</dd>
        </div>
        <div>
          <dt>Zawal</dt>
          <dd>{row?.zawwal_start ? displayZawal(row) : unknown}</dd>
        </div>
      </dl>
      {row?.source && <p>{row.source}</p>}
    </section>
  );
}
