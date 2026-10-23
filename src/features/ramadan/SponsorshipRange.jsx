import React, { useId } from 'react';
import { daysInRange, fullDate } from '@/lib/bookingCalendar';

export default function SponsorshipRange({ days, value, onChange, onSelect, disabled = false }) {
  const fieldId = useId();
  if (!days.length) return null;
  const from = value.from || days[0].date;
  const to = value.to || days.at(-1).date;
  const label = (day) => `${day.number} Ramadan · ${fullDate(day.date)}`;
  const selected = daysInRange(days, { from, to });
  return (
    <div className="sponsorship-range" role="group" aria-label="Sponsorship date range">
      <div className="booking-fields">
        <div className="booking-field">
          <label htmlFor={`${fieldId}-from`}>From</label>
          <select
            id={`${fieldId}-from`}
            value={from}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                from: event.target.value,
                to: to < event.target.value ? event.target.value : to,
              })
            }
          >
            {days.map((day) => (
              <option value={day.date} key={day.date}>
                {label(day)}
              </option>
            ))}
          </select>
        </div>
        <div className="booking-field">
          <label htmlFor={`${fieldId}-to`}>To</label>
          <select
            id={`${fieldId}-to`}
            value={to}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                from: from > event.target.value ? event.target.value : from,
                to: event.target.value,
              })
            }
          >
            {days.map((day) => (
              <option value={day.date} key={day.date}>
                {label(day)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="booking-actions">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange({ from: days[0].date, to: days.at(-1).date })}
        >
          Whole Ramadan
        </button>
        {onSelect && (
          <button
            type="button"
            className="primary"
            disabled={disabled || !selected.length}
            onClick={() => onSelect(selected.map((day) => day.date))}
          >
            Select these days
          </button>
        )}
        <span>
          {selected.length} {selected.length === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  );
}
