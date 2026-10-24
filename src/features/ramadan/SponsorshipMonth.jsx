import React from 'react';
import { fullDate } from '@/lib/bookingCalendar';
import { RAMADAN_COLOURS, ramadanStatus } from './model';

/** Show the whole Ramadan, including UK month boundaries, without moving filtered dates. */
export default function SponsorshipMonth({
  days,
  visibleDates,
  kind,
  selected,
  dayInfo,
  onSelect,
  disabled,
}) {
  if (!days.length) return null;
  const offset = (new Date(`${days[0].date}T12:00:00`).getDay() + 6) % 7;
  return (
    <div className="sponsorship-month" role="group" aria-label="Ramadan month">
      <p className="sponsorship-month-help">
        Tap a day to view or add a sponsor. Open: available · Held: reserved ·{' '}
        {kind === 'daily' ? 'Given: supported' : 'Taken: sponsored'}.
      </p>
      <div className="sponsorship-month-week" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="sponsorship-month-grid">
        {Array.from({ length: offset }, (_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const info = dayInfo(day.date);
          const matches = visibleDates.has(day.date);
          const status = ramadanStatus(kind, info.status);
          const ukDate = new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          });
          return (
            <button
              type="button"
              key={day.date}
              className={`sponsorship-month-day ${matches ? '' : 'is-filtered'}`}
              style={{ '--day-colour': RAMADAN_COLOURS[info.status] }}
              aria-label={`Day ${day.number}, ${fullDate(day.date)}, ${status}`}
              aria-pressed={selected === day.date}
              disabled={disabled || !matches}
              onClick={() => onSelect(day.date)}
              title={`${day.number} Ramadan · ${ukDate} · ${status}`}
            >
              <strong>{day.number}</strong>
              <span>{ukDate}</span>
              <span className="sponsorship-month-status" aria-hidden="true">
                {{ Available: 'Open', Sponsored: 'Taken', Supported: 'Given', Reserved: 'Held' }[
                  status
                ] || status}
              </span>
            </button>
          );
        })}
      </div>
      {!visibleDates.size && <p role="status">No sponsorships match this range and status.</p>}
    </div>
  );
}
