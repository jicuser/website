import React from 'react';
import { Sunrise, Sunset, Sun, SunMedium } from 'lucide-react';
import { usePublishedPrayerDetails } from '@/features/prayer-details/usePublishedPrayerDetails';
import { compactTime } from '@/lib/homePrayerView';
import { displayLondonClock } from '@/lib/timetable';
import PrayerClock from '@/components/PrayerClock';
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
    shuroq.ishraqAt === null ? null : displayLondonClock(new Date(shuroq.ishraqAt));
  return (
    <>
      <dl
        className="jic-card-extra-times"
        aria-label="Daily sun times, in order from sunrise to sunset"
        data-has-sunset={sunset !== '—' || undefined}
      >
        <div className="jic-card-shuroq" data-sunrise-phase={shuroq.phase}>
          <dt>{compact && <Sunrise size={13} aria-hidden="true" />} Sunrise</dt>
          <dd>
            <PrayerClock value={sunrise} />
          </dd>
        </div>
        <div className="jic-card-ishraq" aria-current={shuroq.startingIshraq ? 'time' : undefined}>
          <dt title="Approximately 20 minutes after sunrise">
            {compact && <Sun size={13} aria-hidden="true" />} Ishraq ≈
          </dt>
          <dd data-unavailable={shuroq.ishraqAt === null || undefined}>
            <PrayerClock value={ishraqTime} />
            <span className="sr-only"> · Estimated from sunrise + 20 min</span>
          </dd>
        </div>
        <div className="jic-card-zawal" aria-current={zawalActive ? 'time' : undefined}>
          <dt>{compact && <SunMedium size={13} aria-hidden="true" />} Zawal</dt>
          <dd
            data-unavailable={!detail?.zawwal_start || undefined}
            aria-label={!detail?.zawwal_start ? unavailable : undefined}
          >
            <PrayerClock value={detail?.zawwal_start} />
            {detail?.zawwal_start && detail?.zawwal_end && (
              <>
                {' '}
                – <PrayerClock value={detail.zawwal_end} />
              </>
            )}
          </dd>
        </div>
        <div className="jic-card-sunset">
          <dt>{compact && <Sunset size={13} aria-hidden="true" />} Sunset</dt>
          <dd
            data-unavailable={sunset === '—' || undefined}
            aria-label={sunset === '—' ? unavailable : undefined}
          >
            <PrayerClock value={sunset} />
          </dd>
        </div>
      </dl>
      {shuroq.phase === 'active' && (
        <span className="sr-only">Shuruq · Prohibited time until ≈ {ishraqTime}.</span>
      )}
      {showSource && detail?.source && (
        <details className="jic-extra-times-source">
          <summary>Timetable source</summary>
          <p>{detail.source}</p>
        </details>
      )}
    </>
  );
}
