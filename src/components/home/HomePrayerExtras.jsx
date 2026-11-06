import React from 'react';
import { Sunrise, Sunset, Sun, SunMedium } from 'lucide-react';
import { usePublishedPrayerDetails } from '@/features/prayer-details/usePublishedPrayerDetails';
import { compactTime } from '@/lib/homePrayerView';
import { displayZawal } from '@/lib/timetable';
import { sunriseStatus } from '@/lib/sunriseStatus';
import { londonDay, londonWallInstant } from '@/lib/prayerDisplayState';

export default function HomePrayerExtras({
  date,
  sunrise,
  now = new Date(),
  compact = false,
  showSource = false,
}) {
  const { rows, status } = usePublishedPrayerDetails(date);
  const detail = rows?.get(date);
  const sunset = compactTime(detail?.sunset);
  const shuroq = sunriseStatus(date, sunrise, now);
  const zawalAt = londonWallInstant(date, detail?.zawwal_start);
  // Without a published end, highlight the start minute rather than inventing a window.
  const zawalUntil = detail?.zawwal_end
    ? londonWallInstant(date, detail.zawwal_end)
    : zawalAt === null
      ? null
      : zawalAt + 60000;
  const zawalActive =
    date === londonDay(now) &&
    zawalAt !== null &&
    zawalUntil !== null &&
    now.getTime() >= zawalAt &&
    now.getTime() < zawalUntil;
  const unavailable =
    status === 'loading' ? 'Loading…' : status === 'error' ? 'Unavailable' : 'Not published';
  const ishraqTime =
    shuroq.ishraqAt === null
      ? 'Not published'
      : new Date(shuroq.ishraqAt).toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
        });
  return (
    <>
      <dl
        className="jic-card-extra-times"
        aria-label="Daily sun times, in order from sunrise to sunset"
        data-has-sunset={sunset !== '—' || undefined}
      >
        <div className="jic-card-shuroq" data-sunrise-phase={shuroq.phase}>
          <dt>
            {compact && <Sunrise size={13} aria-hidden="true" />} Sunrise
          </dt>
          <dd>{compactTime(sunrise)}</dd>
        </div>
        <div className="jic-card-ishraq" aria-current={shuroq.startingIshraq ? 'time' : undefined}>
          <dt>{compact && <Sun size={13} aria-hidden="true" />} Ishraq ≈</dt>
          <dd data-unavailable={shuroq.ishraqAt === null || undefined}>{ishraqTime}</dd>
        </div>
        <div className="jic-card-zawal" aria-current={zawalActive ? 'time' : undefined}>
          <dt>{compact && <SunMedium size={13} aria-hidden="true" />} Zawal</dt>
          <dd data-unavailable={!detail?.zawwal_start || undefined} aria-label={!detail?.zawwal_start ? unavailable : undefined}>
            {detail?.zawwal_start
              ? displayZawal(detail, compactTime)
              : '—'}
          </dd>
        </div>
        <div className="jic-card-sunset">
          <dt>{compact && <Sunset size={13} aria-hidden="true" />} Sunset</dt>
          <dd data-unavailable={sunset === '—' || undefined} aria-label={sunset === '—' ? unavailable : undefined}>
            {sunset}
          </dd>
        </div>
      </dl>
      <p className="jic-extra-times-note" data-sunrise-active={shuroq.phase === 'active' || undefined}>
        {shuroq.phase === 'active'
          ? `Shuruq · Prohibited time until ≈ ${ishraqTime}. `
          : ''}
        Ishraq ≈ sunrise + 20 min
        {(sunset === '—' || !detail?.zawwal_start) && ` · — ${unavailable}`}
      </p>
      {showSource && detail?.source && (
        <details className="jic-extra-times-source">
          <summary>Timetable source</summary>
          <p>{detail.source}</p>
        </details>
      )}
    </>
  );
}
