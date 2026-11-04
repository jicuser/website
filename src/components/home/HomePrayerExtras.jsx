import React from 'react';
import { usePublishedPrayerDetails } from '@/features/prayer-details/usePublishedPrayerDetails';
import { compactTime } from '@/lib/homePrayerView';
import { displayZawal } from '@/lib/timetable';
import { londonWallInstant } from '@/lib/prayerDisplayState';

export default function HomePrayerExtras({ date, sunrise, now }) {
  const { rows, status } = usePublishedPrayerDetails(date);
  const detail = rows?.get(date);
  const sunriseInstant = londonWallInstant(date, sunrise);
  const ishraqInstant = sunriseInstant === null ? null : sunriseInstant + 20 * 60000;
  const ishraqTime = ishraqInstant === null ? 'Not published' : new Date(ishraqInstant)
    .toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
  const starting = ishraqInstant !== null && now.getTime() >= ishraqInstant && now.getTime() < ishraqInstant + 60000;
  return (
    <dl className="jic-card-extra-times">
      <div><dt>Sunrise</dt><dd>{compactTime(sunrise)}</dd></div>
      <div className="jic-card-ishraq" aria-current={starting ? 'time' : undefined}>
        <dt>Ishraq starts ≈</dt><dd>{ishraqTime}</dd>
        <small>Sunrise + 20 min</small>
      </div>
      <div><dt>Zawal</dt><dd>{detail?.zawwal_start ? displayZawal(detail, compactTime) : status === 'loading' ? 'Loading…' : status === 'error' ? 'Unavailable' : 'Not published'}</dd></div>
    </dl>
  );
}
