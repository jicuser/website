import React from 'react';
import { fullDate } from '@/lib/bookingCalendar';
import { RAMADAN_COLOURS, ramadanStatus } from './model';

export default function SponsorshipTable({
  days,
  kind,
  selected = [],
  onSelect,
  dayInfo,
  disabled = false,
}) {
  return (
    <div
      className="booking-table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Ramadan sponsorship table"
    >
      <table className="booking-table sponsorship-availability-table">
        <thead>
          <tr>
            <th scope="col">Ramadan day</th>
            <th scope="col">UK date</th>
            <th scope="col">Status</th>
            <th scope="col">Sponsor</th>
            <th scope="col">Choose</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const info = dayInfo(day.date),
              active = selected.includes(day.date);
            return (
              <tr key={day.date} className={active ? 'is-selected' : undefined}>
                <th scope="row">{day.number} Ramadan</th>
                <td>{fullDate(day.date)}</td>
                <td>
                  <span
                    className="booking-dot"
                    style={{ '--day-colour': RAMADAN_COLOURS[info.status] }}
                  />{' '}
                  {ramadanStatus(kind, info.status)}
                </td>
                <td>{info.names?.join(', ') || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="booking-button"
                    aria-pressed={active}
                    aria-label={`Select ${day.number} Ramadan, ${fullDate(day.date)}`}
                    disabled={disabled || info.disabled}
                    onClick={() => onSelect(day.date)}
                  >
                    {active ? 'Selected' : 'Select'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
