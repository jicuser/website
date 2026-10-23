import React from 'react';
import { Check, Moon, Sun } from 'lucide-react';
import { fullDate } from '@/lib/bookingCalendar';
import { RAMADAN_COLOURS, ramadanStatus } from './model';
import '@/styles/booking-calendars.css';
import '@/styles/ramadan.css';

export default function SponsorshipDays({
  days,
  kind,
  selected = [],
  onSelect,
  dayInfo,
  disabled = false,
  manage = false,
  compact = false,
}) {
  return (
    <div
      className={`sponsorship-days ${compact ? 'is-compact' : ''}`}
      role="group"
      aria-label={manage ? 'Open or close sponsorship days' : 'Choose sponsorship days'}
    >
      {days.map((day) => {
        const info = dayInfo(day.date),
          active = selected.includes(day.date);
        return (
          <button
            key={day.date}
            type="button"
            className={`sponsorship-day ${active ? 'is-selected' : ''}`}
            style={{ '--day-colour': RAMADAN_COLOURS[info.status] }}
            disabled={disabled || info.disabled}
            role={manage ? 'switch' : undefined}
            aria-checked={manage ? info.enabled : undefined}
            aria-pressed={manage ? undefined : active}
            aria-label={`Day ${day.number}, ${fullDate(day.date)}, ${manage ? (info.enabled ? 'open' : 'closed') : ramadanStatus(kind, info.status)}`}
            onClick={() => onSelect(day.date)}
          >
            <span className="sponsorship-day-top">
              <strong>Day {day.number}</strong>
              {active ? (
                <Check size={16} />
              ) : kind === 'suhoor' ? (
                <Sun size={15} />
              ) : (
                <Moon size={15} />
              )}
            </span>
            <span>
              {new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <b>{manage ? (info.enabled ? 'Open' : 'Closed') : ramadanStatus(kind, info.status)}</b>
            {!manage && info.names?.length > 0 && <small>{info.names.join(', ')}</small>}
          </button>
        );
      })}
    </div>
  );
}
