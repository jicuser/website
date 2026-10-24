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
      className="booking-table-wrap sponsorship-table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Ramadan sponsorship table"
    >
      <p className="sponsorship-table-hint">Scroll across to see all columns.</p>
      <table className="booking-table sponsorship-availability-table sponsorship-mobile-table">
        <thead>
          <tr>
            <th scope="col" className="sponsorship-day-cell">
              Ramadan day
            </th>
            <th scope="col" className="sponsorship-date-cell">
              UK date
            </th>
            <th scope="col" className="sponsorship-status-cell">
              Status
            </th>
            <th scope="col">Sponsor</th>
            <th scope="col" className="sponsorship-action-cell">
              Choose
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const info = dayInfo(day.date),
              active = selected.includes(day.date);
            return (
              <tr key={day.date} className={active ? 'is-selected' : undefined}>
                <th scope="row" className="sponsorship-day-cell">
                  {day.number} Ramadan
                </th>
                <td className="sponsorship-date-cell">{fullDate(day.date)}</td>
                <td className="sponsorship-status-cell">
                  <span className="sponsorship-status">
                    <i
                      className="booking-dot"
                      aria-hidden="true"
                      style={{ '--day-colour': RAMADAN_COLOURS[info.status] }}
                    />
                    {ramadanStatus(kind, info.status)}
                  </span>
                </td>
                <td className="sponsorship-sponsor-cell">
                  {info.names?.join(', ') || (info.status === 'confirmed' ? 'Anonymous' : '—')}
                </td>
                <td className="sponsorship-action-cell">
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
