import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone } from 'lucide-react';
import { SITE } from '@/content/site';
import { nextPrayer } from '@/lib/nextPrayer';
import { cn } from '@/lib/utils';

const PRAYERS = [
  ['Fajr', 'fajr', 'jamaah_fajr'],
  ['Sunrise', 'sunrise', null],
  ['Dhuhr', 'dhuhr', 'jamaah_dhuhr'],
  ['Asr', 'asr', 'jamaah_asr'],
  ['Maghrib', 'maghrib', 'jamaah_maghrib'],
  ['Isha', 'isha', 'jamaah_isha'],
];
const shortTime = (value) =>
  value && value !== 'N/A'
    ? String(value)
        .replace(/^0/, '')
        .replace(/\s?[AP]M$/i, '')
    : '—';

/** Shared timetable data for the website and TV. The optional radio belongs to the website. */
export default function PrayerTimeBar({
  todaysTimes,
  jummahTimes,
  currentDate,
  radio,
  interactive = true,
  showContact = true,
}) {
  const next = nextPrayer(todaysTimes, currentDate);
  const Item = interactive ? Link : 'div';
  const destination = (path) => (interactive ? { to: path } : {});

  return (
    <div className="jic-unified-info">
      {showContact && (
        <div className="jic-header-context">
          <Link to="/contact#map">
            <MapPin size={14} />
            <span>{SITE.address.short}</span>
          </Link>
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
            <Phone size={14} />
            {SITE.phone}
          </a>
        </div>
      )}
      <div className="jic-prayer-legend">
        <Item {...destination('/prayer-times')} className="jic-next-prayer-summary">
          {next ? (
            <>
              <strong>Next: {next.name}</strong>
              <span>
                Start {shortTime(next.time)} · Jama’ah {shortTime(next.jamaah)}
              </span>
            </>
          ) : (
            'Prayer timetable'
          )}
          {interactive && <span aria-hidden="true">›</span>}
        </Item>
        {next && (
          <span className="jic-prayer-countdown">
            {Math.floor(next.minutesLeft / 60) > 0 ? `${Math.floor(next.minutesLeft / 60)}h ` : ''}
            {next.minutesLeft % 60}m until {next.name} starts
          </span>
        )}
      </div>
      <div className="jic-prayer-table-scroll">
        <div className="jic-today-prayer-row" aria-label="Today’s prayer times">
          <span className="jic-prayer-row-label is-start" aria-hidden="true">
            Start
          </span>
          <span className="jic-prayer-row-label is-jamaah" aria-hidden="true">
            Jama’ah
          </span>
          {PRAYERS.map(([label, key, jamaah]) => (
            <Item
              key={key}
              {...destination('/prayer-times')}
              className={cn('jic-today-prayer', next?.name === label && 'is-next')}
              aria-label={`${label}: begins ${shortTime(todaysTimes?.[key])}${jamaah ? `, Jama‘ah ${shortTime(todaysTimes?.[jamaah])}` : ''}`}
            >
              <span>{label}</span>
              <div>
                <strong>
                  <small>Start</small>
                  {shortTime(todaysTimes?.[key])}
                </strong>
                <em>
                  <small>{jamaah ? 'Jama’ah' : '—'}</small>
                  {jamaah ? shortTime(todaysTimes?.[jamaah]) : '—'}
                </em>
              </div>
            </Item>
          ))}
        </div>
      </div>
      <div className="jic-header-live-row">
        {[0, 1].map((index) => (
          <Item key={index} {...destination('/prayer-times/jummah')} className="jic-jummah-compact">
            <b>Jummah {index + 1}</b>
            <span>{shortTime(jummahTimes?.[index]?.prayer)}</span>
          </Item>
        ))}
        {radio}
      </div>
    </div>
  );
}
