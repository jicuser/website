import React from 'react';
import { Sunrise, Sun, SunMedium } from 'lucide-react';
import { usePublishedPrayerDetails } from '@/features/prayer-details/usePublishedPrayerDetails';
import { compactTime } from '@/lib/homePrayerView';
import { displayZawal } from '@/lib/timetable';
import { sunriseStatus } from '@/lib/sunriseStatus';

export default function HomePrayerExtras({ date, sunrise, now, compact = false }) {
  const { rows, status } = usePublishedPrayerDetails(date);
  const detail = rows?.get(date);
  const shuroq = sunriseStatus(date, sunrise, now);
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
    <dl className="jic-card-extra-times">
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
      <div>
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
    </dl>
  );
}
