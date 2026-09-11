import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SITE } from '@/content/site';

const STATUS_META = {
  available: { label: 'Available', className: 'is-available' },
  pending: { label: 'Pending', className: 'is-pending' },
  booked: { label: 'Booked', className: 'is-booked' },
  closed: { label: 'Unavailable', className: 'is-closed' },
  unknown: { label: 'Check availability', className: 'is-unknown' },
};

const pad = (value) => String(value).padStart(2, '0');
const isoDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthLabel = (date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date);

const normaliseStatus = (value) => {
  const status = String(value || '')
    .toLowerCase()
    .trim();
  if (['booked', 'confirmed', 'paid'].includes(status)) return 'booked';
  if (['pending', 'reserved', 'provisional', 'hold'].includes(status)) return 'pending';
  if (['available', 'free', 'open'].includes(status)) return 'available';
  if (['closed', 'unavailable', 'blocked', 'cancelled'].includes(status)) return 'closed';
  return 'unknown';
};

const getRecordDate = (row) =>
  row.booking_date || row.event_date || row.date || row.start_date || null;

export default function HallBookingPage() {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveSchedule, setLiveSchedule] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const first = new Date(month.getFullYear(), month.getMonth(), 1);
      const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      try {
        const { data, error } = await supabase.from('hall_bookings').select('*');
        if (!active) return;

        if (error) {
          setRecords([]);
          setLiveSchedule(false);
        } else {
          const monthRows = (data || []).filter((row) => {
            const raw = getRecordDate(row);
            if (!raw) return false;
            const date = new Date(raw);
            return (
              !Number.isNaN(date.getTime()) &&
              date >= first &&
              date <= new Date(last.getFullYear(), last.getMonth(), last.getDate(), 23, 59, 59)
            );
          });
          setRecords(monthRows);
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
    };
  }, [month]);

  const statusByDate = useMemo(() => {
    const map = new Map();
    records.forEach((row) => {
      const raw = getRecordDate(row);
      if (!raw) return;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return;

      const key = isoDate(date);
      const status = normaliseStatus(row.status || row.booking_status || row.state);
      const existing = map.get(key);
      const rank = { booked: 4, pending: 3, closed: 2, available: 1, unknown: 0 };
      if (!existing || rank[status] > rank[existing]) map.set(key, status);
    });
    return map;
  }, [records]);

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
      <section
        className="jic-hall-calendar rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-3xl sm:p-6"
        aria-labelledby="hall-calendar-title"
      >
        <div className="jic-hall-calendar-head">
          <div>
            <p className="jic-hall-kicker">
              <CalendarDays size={15} /> Monthly schedule
            </p>
            <h1 id="hall-calendar-title">{monthLabel(month)}</h1>
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
            Live booking statuses are not published yet. Dates are shown as{' '}
            <strong>Check availability</strong> until the hall-booking data source is connected.
          </div>
        )}

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
            const status = liveSchedule ? statusByDate.get(key) || 'available' : 'unknown';
            const meta = STATUS_META[status];
            const today = key === isoDate(new Date());
            return (
              <div
                key={key}
                className={`jic-hall-day ${meta.className} ${today ? 'is-today' : ''}`}
                title={`${date.toLocaleDateString('en-GB')} · ${meta.label}`}
              >
                <span className="jic-hall-date">{date.getDate()}</span>
                <span className="jic-hall-status">{meta.label}</span>
              </div>
            );
          })}
        </div>

        <div className="jic-hall-legend" aria-label="Availability key">
          {Object.entries(STATUS_META)
            .filter(([key]) => ['available', 'pending', 'booked', 'closed'].includes(key))
            .map(([key, meta]) => (
              <span key={key}>
                <i className={meta.className} />
                {meta.label}
              </span>
            ))}
        </div>

        <div className="jic-hall-contact">
          <div>
            <strong>Interested in a date?</strong>
            <span>
              Availability can change, so please confirm with the centre before making arrangements.
            </span>
          </div>
          <a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>
            <Phone size={17} /> Call {SITE.phone}
          </a>
        </div>
      </section>
    </div>
  );
}
