import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { usePublicPrayerTimes } from '@/context/PrayerTimesContext';
import { nextCongregation } from '@/lib/nextCongregation';
import { displayTime } from '@/lib/timetable';
import { cn } from '@/lib/utils';

const compactPrayerTime = (value) => {
  const formatted = displayTime(value);
  return formatted === '—' ? '—' : formatted.replace(/\s+/g, '').toLowerCase();
};

function CompactPrayerTime({ value }) {
  const [clock, period] = compactPrayerTime(value).split(/(?=[ap]m$)/);
  return (
    <>
      {clock}
      {period && <small>{period}</small>}
    </>
  );
}

// The home card and inner-page dock share the same published times and labels.
export default function TodayPrayerSummary({ showLink = true }) {
  const { todaysTimes, jummahTimes, currentDate, isLoadingPrayerTimes } = usePublicPrayerTimes();
  const next = nextCongregation(todaysTimes, jummahTimes, currentDate);
  const isFriday =
    currentDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short' }) ===
    'Fri';
  const todayCongregations = [
    { name: 'Fajr', start: todaysTimes?.fajr, time: todaysTimes?.jamaah_fajr },
    {
      name: 'Dhuhr',
      start: todaysTimes?.dhuhr,
      time: isFriday ? null : todaysTimes?.jamaah_dhuhr,
    },
    { name: 'Asr', start: todaysTimes?.asr, time: todaysTimes?.jamaah_asr },
    { name: 'Maghrib', start: todaysTimes?.maghrib, time: todaysTimes?.jamaah_maghrib },
    { name: 'Isha', start: todaysTimes?.isha, time: todaysTimes?.jamaah_isha },
  ];
  const accessiblePrayerTimes = todaysTimes
    ? todayCongregations
        .map(
          ({ name, start, time }) =>
            `${name}: start ${displayTime(start)}${name === 'Dhuhr' && isFriday ? ', Jummah sessions below' : `, jama’ah ${displayTime(time)}`}`,
        )
        .join(', ') +
      (isFriday
        ? jummahTimes.map((s, i) => `, Jummah ${i + 1}: ${displayTime(s.prayer)}`).join('')
        : '')
    : isLoadingPrayerTimes
      ? 'Loading times'
      : 'Times unavailable';

  return (
    <Link
      to="/prayer-times"
      className="jic-mobile-prayer-content"
      aria-label={`Today's prayer times: ${accessiblePrayerTimes}. View full timetable`}
    >
      <span className="jic-mobile-prayer-rows">
        <span className="jic-mobile-prayer-heading">
          <span>Today’s prayer times</span>
          {showLink && (
            <span className="jic-mobile-prayer-link">
              Full timetable <ChevronRight size={13} aria-hidden="true" />
            </span>
          )}
        </span>
        {todaysTimes ? (
          <span className="jic-mobile-prayer-times" aria-hidden="true">
            <span className="jic-mini-prayer jic-mini-prayer-labels">
              <span className="jic-mini-prayer-name">&nbsp;</span>
              <span className="jic-mini-prayer-start">Start</span>
              <strong className="jic-mini-prayer-time">Jama’ah</strong>
            </span>
            {todayCongregations.map(({ name, start, time }) => (
              <span
                key={name}
                className={cn(
                  'jic-mini-prayer',
                  (next?.name === name || (name === 'Jummah' && next?.name === 'Jummah 1')) &&
                    'is-next',
                )}
              >
                <span className="jic-mini-prayer-name">{name}</span>
                <span className="jic-mini-prayer-start">
                  <CompactPrayerTime value={start} />
                </span>
                <strong className="jic-mini-prayer-time">
                  <CompactPrayerTime value={time} />
                </strong>
              </span>
            ))}
          </span>
        ) : (
          <span className="jic-mobile-prayer-empty" role="status">
            {isLoadingPrayerTimes ? 'Loading today’s times…' : 'Today’s timetable is unavailable'}
          </span>
        )}
        {isFriday && todaysTimes && (
          <span className="jic-mini-friday">
            {jummahTimes.map((session, index) => (
              <span key={index} data-upcoming={next?.name === `Jummah ${index + 1}` || undefined}>
                {index === 0 ? '1st' : '2nd'} Jummah <b>{displayTime(session.prayer)}</b>
              </span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
}
