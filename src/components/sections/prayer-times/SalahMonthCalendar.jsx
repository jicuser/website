import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { salahCalendar, salahDateLabel } from '@/lib/salahWorkspace';

export default function SalahMonthCalendar({ dates, selected, today, onSelect }) {
  const month = selected.slice(0, 7);
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))];
  const index = months.indexOf(month);
  const available = new Set(dates);
  const move = (direction) => {
    const next = months[index + direction];
    const date = dates.find((value) => value.startsWith(`${next}-`));
    if (date) onSelect(date);
  };
  return (
    <section className="salah-calendar" aria-label="Choose timetable day">
      <header>
        <h2>{salahDateLabel(`${month}-01`, true)}</h2>
        <div>
          <button
            type="button"
            aria-label="Previous month"
            disabled={index <= 0}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            className="salah-calendar-today"
            type="button"
            disabled={!available.has(today)}
            onClick={() => onSelect(today)}
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            disabled={index < 0 || index >= months.length - 1}
            onClick={() => move(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </header>
      <div
        className="salah-calendar-grid"
        role="group"
        aria-label={`${salahDateLabel(`${month}-01`, true)} dates`}
      >
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span className="salah-weekday" key={day} aria-hidden="true">
            {day}
          </span>
        ))}
        {salahCalendar(month).map((date, position) =>
          date ? (
            <button
              type="button"
              key={date}
              aria-label={`${salahDateLabel(date)}${date === today ? ', today' : ''}${!available.has(date) ? ', times not published' : ''}`}
              disabled={!available.has(date)}
              aria-pressed={date === selected}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(-2))}
            </button>
          ) : (
            <span key={`blank-${position}`} aria-hidden="true" />
          ),
        )}
      </div>
      {!dates.length && (
        <p className="salah-empty">This month’s timetable has not been published.</p>
      )}
    </section>
  );
}
