import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { hallDateStatus, hallMonthRange } from '@/lib/serviceEnquiries';
import { CALENDAR_COLOURS, HALL_STATUSES, fullDate } from '@/lib/bookingCalendar';
import { displayTime, londonDate } from '@/lib/timetable';
import MonthCalendar from '@/components/calendar/MonthCalendar';

const labels = {
  available: 'Available',
  pending: 'Provisional',
  booked: 'Booked',
  closed: 'Closed',
  unknown: 'Ask us',
  partial: 'Times',
};
export default function HallBookingPage() {
  const [month, setMonth] = useState(() => new Date(`${londonDate().slice(0, 7)}-01T12:00:00`));
  const [records, setRecords] = useState([]),
    [colours, setColours] = useState(CALENDAR_COLOURS),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [selected, setSelected] = useState(''),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setSelected('');
    setError('');
    const range = hallMonthRange(month.getFullYear(), month.getMonth());
    Promise.all([
      supabase
        .from('hall_bookings')
        .select('booking_date,start_time,end_time,status')
        .gte('booking_date', range.first)
        .lte('booking_date', range.last)
        .order('booking_date')
        .limit(1000)
        .abortSignal(controller.signal),
      supabase
        .from('hall_calendar_settings')
        .select('available,pending,booked,closed')
        .eq('id', true)
        .maybeSingle()
        .abortSignal(controller.signal),
    ])
      .then(([bookings, settings]) => {
        if (!active) return;
        if (bookings.error) throw bookings.error;
        setRecords(bookings.data || []);
        if (settings.data) setColours({ ...CALENDAR_COLOURS, ...settings.data });
      })
      .catch(() => {
        if (active) {
          setRecords([]);
          setError('The calendar could not be loaded. Please try again or contact the centre.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [month, revision]);
  const state = selected ? hallDateStatus(records, selected) : 'unknown';
  const entries = records.filter((row) => row.booking_date === selected);
  const canEnquire = selected && !['booked', 'closed'].includes(state);
  return (
    <div className="booking-workspace">
      <header>
        <h1>Hall booking</h1>
        <p>Choose a date, then send your request. The office will confirm your booking.</p>
      </header>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="booking-button" onClick={() => setRevision((value) => value + 1)}>
            Try again
          </button>
        </p>
      )}
      <div className="booking-layout">
        <div className="booking-panel">
          {loading && <p role="status">Loading dates…</p>}
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            selected={selected ? [selected] : []}
            onSelect={setSelected}
            disabled={loading || !!error}
            dayInfo={(date) => {
              const status = hallDateStatus(records, date);
              return {
                label: labels[status],
                colour: colours[status === 'partial' ? 'pending' : status],
                disabled: date < londonDate(),
              };
            }}
          />
          <div className="booking-key" aria-label="Calendar colours">
            {[...HALL_STATUSES, ['unknown', 'Ask us']].map(([key, label]) => (
              <span key={key}>
                <i className="booking-dot" style={{ '--day-colour': colours[key] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <section className="booking-panel" aria-live="polite">
          <h2>{selected ? fullDate(selected) : 'Choose your date'}</h2>
          {selected ? (
            <>
              <p>
                <strong>{state === 'partial' ? 'Times on this date' : labels[state]}</strong>
              </p>
              {entries
                .filter((row) => row.start_time)
                .map((row, index) => (
                  <p key={index}>
                    {displayTime(row.start_time)}–{displayTime(row.end_time)} · {labels[row.status]}
                  </p>
                ))}
              {state === 'unknown' && <p>The team will check availability for you.</p>}
              {state === 'pending' && (
                <p>A provisional booking is being checked. You can ask about other times.</p>
              )}
              {['booked', 'closed'].includes(state) && <p>Please choose another date.</p>}
            </>
          ) : (
            <p>Tap a day on the calendar to see its availability.</p>
          )}
          {canEnquire && (
            <div className="booking-actions">
              <Link className="primary" to={`/forms/hall-booking?date=${selected}`}>
                Request this date
              </Link>
            </div>
          )}
          <div className="booking-actions">
            <Link to="/contact">Contact the office</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
