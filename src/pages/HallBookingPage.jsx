import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { hallDateStatus, hallMonthRange } from '@/lib/serviceEnquiries';

const STATUS_META = {
  available: { label: 'Enquire', className: 'is-available' },
  pending: { label: 'Pending', className: 'is-pending' },
  booked: { label: 'Booked', className: 'is-booked' },
  closed: { label: 'Unavailable', className: 'is-closed' },
  unknown: { label: 'Check availability', className: 'is-unknown' },
  partial: { label: 'Check times', className: 'is-pending' },
};

const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthLabel = (date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);

export default function HallBookingPage() {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveSchedule, setLiveSchedule] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    let active = true;
    setSelectedDate('');
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      const { first, last } = hallMonthRange(month.getFullYear(), month.getMonth());

      try {
        const { data, error } = await supabase
          .from('hall_bookings')
          .select('booking_date,start_time,end_time,status')
          .gte('booking_date', first)
          .lte('booking_date', last)
          .order('booking_date')
          .limit(1000)
          .abortSignal(controller.signal);
        if (!active) return;

        if (error) {
          setRecords([]);
          setLiveSchedule(false);
        } else {
          setRecords(data || []);
          setLiveSchedule(true);
        }
      } catch {
        if (active) {
          setRecords([]);
          setLiveSchedule(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [month]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const mondayOffset = (first.getDay() + 6) % 7;
    const cells = Array.from({ length: mondayOffset }, () => null);
    for (let day = 1; day <= count; day += 1)
      cells.push(new Date(month.getFullYear(), month.getMonth(), day));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  const changeMonth = (amount) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <div className="jic-hall-page mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1>Hall booking</h1>
      <p>
        Choose a date and send an enquiry. The team will check your event details and confirm
        availability.
      </p>
      <ol className="jic-booking-steps" aria-label="How booking works">
        <li>Send an enquiry</li>
        <li>Staff review your request</li>
        <li>Receive confirmation</li>
      </ol>
      <section
        className="jic-hall-calendar rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-3xl sm:p-6"
        aria-labelledby="hall-calendar-title"
      >
        <div className="jic-hall-calendar-head">
          <div>
            <p className="jic-hall-kicker">
              <CalendarDays size={15} /> Monthly schedule
            </p>
            <h2 id="hall-calendar-title">{monthLabel(month)}</h2>
          </div>
          <div className="jic-hall-month-controls">
            <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
            >
              Today
            </button>
            <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {!liveSchedule && !loading && (
          <div className="jic-hall-notice">
            Availability is currently unconfirmed. Please contact the centre about dates marked{' '}
            <strong>Check availability</strong>.
          </div>
        )}
        {loading && <p role="status">Checking published dates…</p>}

        <div className="jic-hall-weekdays" aria-hidden="true">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="jic-hall-grid">
          {days.map((date, index) => {
            if (!date)
              return (
                <div key={`blank-${index}`} className="jic-hall-day is-empty" aria-hidden="true" />
              );
            const key = isoDate(date);
            const status = liveSchedule ? hallDateStatus(records, key) : 'unknown';
            const meta = STATUS_META[status];
            const today = key === isoDate(new Date());
            const unavailable = key < isoDate(new Date()) || ['closed', 'booked'].includes(status);
            return (
              <button
                type="button"
                key={key}
                className={`jic-hall-day ${meta.className} ${today ? 'is-today' : ''}`}
                disabled={loading || unavailable}
                aria-pressed={selectedDate === key}
                aria-label={`${date.toLocaleDateString('en-GB')} · ${meta.label}`}
                onClick={() => setSelectedDate(key)}
                title={`${date.toLocaleDateString('en-GB')} · ${meta.label}`}
              >
                <span className="jic-hall-date">{date.getDate()}</span>
                <span className="jic-hall-status">{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="jic-hall-legend" aria-label="Availability key">
          {Object.entries(STATUS_META)
            .filter(([key]) => ['unknown', 'partial', 'booked', 'closed'].includes(key))
            .map(([key, meta]) => (
              <span key={key}>
                <i className={meta.className} />
                {meta.label}
              </span>
            ))}
        </div>

        <div className="jic-hall-contact">
          <div>
            <strong>
              {selectedDate
                ? `Selected: ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Interested in a date?'}
            </strong>
            <span>
              Check the calendar, then send a booking request. A request is not confirmed until
              staff approve the date.
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={selectedDate ? `/forms/hall-booking?date=${selectedDate}` : '/forms/hall-booking'}
            >
              <CalendarDays size={17} /> Send booking enquiry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
