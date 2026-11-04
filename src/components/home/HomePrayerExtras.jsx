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
  const ishraqTime =
    shuroq.ishraqAt === null
      ? 'Not published'
      : new Date(shuroq.ishraqAt).toLocaleTimeString('en-GB', {
          timeZone: 'Europe/London',
          hour: '2-digit',
          minute: '2-digit',
        });
  const sunriseLabel = shuroq.phase === 'active' ? 'Shuroq time' : 'Sunrise';
  const statusLabel = { upcoming: 'Upcoming', active: 'Prohibited time', passed: 'Passed' }[
    shuroq.phase
  ];
  return (
    <>
      <dl
        className="jic-card-extra-times"
        aria-label="Sunrise and additional times"
        data-has-sunset={sunset !== '—' || undefined}
      >
        <div className="jic-card-shuroq" data-sunrise-phase={shuroq.phase}>
          <dt>
            {statusLabel && <small className="jic-shuroq-status">{statusLabel}</small>}
            <span>
              {compact && <Sunrise size={13} aria-hidden="true" />} {sunriseLabel}
            </span>
          </dt>
          <dd>{compactTime(sunrise)}</dd>
          {shuroq.phase === 'active' && <small>Until ≈ {ishraqTime}</small>}
        </div>
        <div className="jic-card-ishraq" aria-current={shuroq.startingIshraq ? 'time' : undefined}>
          <dt>{compact && <Sun size={13} aria-hidden="true" />} Ishraq starts ≈</dt>
          <dd>{ishraqTime}</dd>
          <small>Sunrise + 20 min</small>
        </div>
        <div className="jic-card-zawal" aria-current={zawalActive ? 'time' : undefined}>
          <dt>{compact && <SunMedium size={13} aria-hidden="true" />} Zawal</dt>
          <dd>
            {detail?.zawwal_start
              ? displayZawal(detail, compactTime)
              : status === 'loading'
                ? 'Loading…'
                : status === 'error'
                  ? 'Unavailable'
                  : 'Not published'}
          </dd>
        </div>
        {sunset !== '—' && (
          <div className="jic-card-sunset">
            <dt>{compact && <Sunset size={13} aria-hidden="true" />} Sunset</dt>
            <dd>{sunset}</dd>
          </div>
        )}
      </dl>
      {showSource && detail?.source && (
        <details className="jic-extra-times-source">
          <summary>Timetable source</summary>
          <p>{detail.source}</p>
        </details>
      )}
    </>
  );
}
