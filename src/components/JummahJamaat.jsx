import React from 'react';
import { Link } from 'react-router-dom';
import PrayerClock from '@/components/PrayerClock';
import { displayTime } from '@/lib/timetable';
import '@/styles/jummah-jamaat.css';

/** One labelled pair of sessions for the home card and prayer docks. */
export default function JummahJamaat({
  sessions = [],
  upcomingName,
  showHeading = false,
  dateLabel,
  linked = true,
  className = '',
}) {
  const numbered = [1, 2].map((number) => ({
    number,
    ordinal: number === 1 ? '1st' : '2nd',
    prayer: sessions.find((session, index) => (session?.number ?? index + 1) === number)?.prayer,
  }));
  const Element = linked ? Link : 'span';
  return (
    <Element
      {...(linked ? { to: '/prayer-times/jummah' } : { role: 'group' })}
      className={`jic-jummah-jamaat ${className}`.trim()}
      aria-label={`Jummah Jamaat${dateLabel ? `, ${dateLabel}` : ''}: ${numbered.map(({ ordinal, prayer }) => `${ordinal} ${displayTime(prayer) === '—' ? 'not published' : displayTime(prayer)}`).join(', ')}`}
    >
      {showHeading && <span className="jic-jummah-heading">Jummah Jamaat</span>}
      {dateLabel && <small className="jic-jummah-date">{dateLabel}</small>}
      <span className="jic-jummah-sessions">
        {numbered.map(({ number, ordinal, prayer }) => (
          <span key={number} data-upcoming={upcomingName === `Jummah ${number}` || undefined}>
            <small className="jic-jummah-ordinal">{ordinal}</small>
            <PrayerClock value={prayer} />
          </span>
        ))}
      </span>
    </Element>
  );
}
