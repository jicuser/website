import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateKey, monthDays } from '@/lib/bookingCalendar';
import { londonDate } from '@/lib/timetable';
import '@/styles/booking-calendars.css';

export default function MonthCalendar({
  month,
  onMonthChange,
  selected = [],
  onSelect,
  dayInfo,
  disabled = false,
}) {
  const today = londonDate();
  const move = (amount) =>
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + amount, 1, 12));
  return (
    <section className="date-calendar" aria-label="Choose calendar dates">
      <div className="date-calendar-toolbar">
        <button type="button" aria-label="Previous month" onClick={() => move(-1)}>
          <ChevronLeft size={18} />
        </button>
        <label>
          <span className="sr-only">Choose month</span>
          <input
            type="month"
            value={dateKey(month).slice(0, 7)}
            onChange={(event) => {
              if (/^\d{4}-\d{2}$/.test(event.target.value))
                onMonthChange(new Date(`${event.target.value}-01T12:00:00`));
            }}
          />
        </label>
        <button type="button" aria-label="Next month" onClick={() => move(1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="date-calendar-week" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="date-calendar-grid">
        {monthDays(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} aria-hidden="true" />;
          const key = dateKey(date),
            info = dayInfo(key);
          return (
            <button
              type="button"
              key={key}
              className={`date-calendar-day ${key === today ? 'is-today' : ''}`}
              style={{ '--day-colour': info.colour }}
              disabled={disabled || info.disabled}
              aria-pressed={selected.includes(key)}
              title={info.label}
              aria-label={`${date.toLocaleDateString('en-GB')} · ${info.label}`}
              onClick={() => onSelect(key)}
            >
              <strong>{date.getDate()}</strong>
              <span>
                {{
                  Available: 'Open',
                  Provisional: 'Held',
                  Booked: 'Busy',
                  Closed: 'Shut',
                  'Ask us': 'Ask',
                }[info.label] || info.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
