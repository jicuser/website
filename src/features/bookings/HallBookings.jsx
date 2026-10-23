import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import {
  CALENDAR_COLOURS,
  HALL_STATUSES,
  dateKey,
  fullDate,
  monthDays,
} from '@/lib/bookingCalendar';
import { hallDateStatus, hallMonthRange } from '@/lib/serviceEnquiries';
import { displayTime, londonDate } from '@/lib/timetable';

const empty = {
  event_title: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
  start_time: '',
  end_time: '',
  status: 'booked',
};
const labels = { ...Object.fromEntries(HALL_STATUSES), unknown: 'Not set', partial: 'Times' };
export default function HallBookings() {
  const loadVersion = useRef(0);
  const auth = useAuth(),
    allowed = auth.can('events');
  const [month, setMonth] = useState(() => new Date(`${londonDate().slice(0, 7)}-01T12:00:00`)),
    [rows, setRows] = useState([]),
    [colours, setColours] = useState(CALENDAR_COLOURS),
    [selected, setSelected] = useState([]),
    [multiple, setMultiple] = useState(false),
    [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!allowed) return;
    const version = ++loadVersion.current;
    setLoading(true);
    setError('');
    const range = hallMonthRange(month.getFullYear(), month.getMonth());
    try {
      const [bookings, settings] = await Promise.all([
        supabase
          .from('hall_bookings')
          .select(
            'id,booking_date,start_time,end_time,status,hall_booking_details(event_title,contact_name,contact_phone,contact_email,notes)',
          )
          .gte('booking_date', range.first)
          .lte('booking_date', range.last)
          .order('booking_date')
          .limit(1000),
        supabase
          .from('hall_calendar_settings')
          .select('available,pending,booked,closed')
          .eq('id', true)
          .single(),
      ]);
      if (version !== loadVersion.current) return;
      if (bookings.error || settings.error) throw new Error('Calendar unavailable. Try again.');
      setRows(bookings.data || []);
      setColours({ ...CALENDAR_COLOURS, ...settings.data });
    } catch (failure) {
      if (version === loadVersion.current) setError(failure.message || 'Could not load bookings.');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [allowed, month]);
  useEffect(() => {
    setSelected([]);
    setEditing(null);
    setForm(empty);
    load();
    return () => {
      loadVersion.current++;
    };
  }, [load]);
  function edit(row) {
    const details = Array.isArray(row.hall_booking_details)
      ? row.hall_booking_details[0]
      : row.hall_booking_details;
    setSelected([row.booking_date]);
    setEditing(row.id);
    setMultiple(false);
    setForm({
      ...empty,
      ...details,
      status: row.status,
      start_time: row.start_time?.slice(0, 5) || '',
      end_time: row.end_time?.slice(0, 5) || '',
    });
  }
  function choose(date) {
    setMessage('');
    if (multiple) {
      setEditing(null);
      setSelected((current) =>
        current.includes(date) ? current.filter((value) => value !== date) : [...current, date],
      );
      return;
    }
    const row = rows.find((row) => row.booking_date === date && !row.start_time && !row.end_time);
    if (row) edit(row);
    else {
      setSelected([date]);
      setEditing(null);
      setForm(empty);
    }
  }
  async function save(event) {
    event.preventDefault();
    if (busy || !selected.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const details = {
        event_title: form.event_title,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        notes: form.notes,
      };
      const { error: failure, data } = await supabase.rpc('save_hall_calendar', {
        p_dates: selected,
        p_status: form.status,
        p_start_time: form.start_time || null,
        p_end_time: form.end_time || null,
        p_details: editing || Object.values(details).some((value) => value.trim()) ? details : null,
        p_id: editing,
      });
      if (failure) throw failure;
      setMessage(`${data} ${data === 1 ? 'day' : 'days'} saved.`);
      setSelected([]);
      setEditing(null);
      setForm(empty);
      await load();
    } catch (failure) {
      setError(failure.message || 'Could not save these dates.');
    } finally {
      setBusy(false);
    }
  }
  async function saveColours() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = Object.fromEntries(HALL_STATUSES.map(([key]) => [key, colours[key]]));
      const result = await supabase
        .from('hall_calendar_settings')
        .update(payload)
        .eq('id', true)
        .select('id')
        .single();
      if (result.error || !result.data) throw new Error('Colours were not saved.');
      setMessage('Calendar colours saved.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row) {
    if (busy || !window.confirm('Delete this booking and its notes?')) return;
    setBusy(true);
    setError('');
    try {
      const result = await supabase
        .from('hall_bookings')
        .delete()
        .eq('id', row.id)
        .select('id')
        .single();
      if (result.error || !result.data) throw new Error('Booking was not deleted.');
      setSelected([]);
      setEditing(null);
      setForm(empty);
      await load();
      setMessage('Booking deleted.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  if (!allowed) return <p>Hall bookings access is required.</p>;
  return (
    <section className="booking-workspace" aria-label="Hall bookings">
      <header>
        <h2>Hall bookings</h2>
        <p>Select days, choose their status, and save.</p>
        <div className="booking-actions">
          <Link to="/services/hall-booking">View public calendar</Link>
          {auth.can('forms') && <Link to="/admin?section=forms">Forms</Link>}
          <button onClick={load} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="booking-layout">
        <div>
          <div className="booking-panel">
            <div className="booking-actions">
              <button
                type="button"
                aria-pressed={multiple}
                onClick={() => {
                  setMultiple((value) => !value);
                  setSelected([]);
                  setEditing(null);
                  setForm(empty);
                }}
              >
                {multiple ? 'Multiple days selected' : 'Select several days'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMultiple(true);
                  setEditing(null);
                  setForm({ ...empty, status: 'available' });
                  setSelected(
                    monthDays(month)
                      .filter(Boolean)
                      .map(dateKey)
                      .filter((date) => !rows.some((row) => row.booking_date === date)),
                  );
                }}
              >
                Select unmarked days
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                  setEditing(null);
                  setForm(empty);
                }}
              >
                Clear selection
              </button>
            </div>
            {loading && <p role="status">Loading calendar…</p>}
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={choose}
              disabled={loading || busy}
              dayInfo={(date) => {
                const status = hallDateStatus(rows, date);
                return {
                  label: labels[status],
                  colour: colours[status === 'partial' ? 'pending' : status],
                };
              }}
            />
            <div className="booking-key">
              {HALL_STATUSES.map(([key, label]) => (
                <span key={key}>
                  <i className="booking-dot" style={{ '--day-colour': colours[key] }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <details className="booking-panel">
            <summary>Calendar colours</summary>
            <div className="booking-colours">
              {HALL_STATUSES.map(([key, label]) => (
                <label key={key}>
                  <input
                    type="color"
                    value={colours[key]}
                    aria-label={`${label} colour`}
                    onChange={(event) =>
                      setColours((current) => ({ ...current, [key]: event.target.value }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="booking-actions">
              <button onClick={saveColours} disabled={busy}>
                Save colours
              </button>
            </div>
          </details>
          {selected.length === 1 &&
            rows
              .filter((row) => row.booking_date === selected[0])
              .map((row) => (
                <article className="booking-panel" key={row.id}>
                  <strong>
                    {fullDate(row.booking_date)} · {labels[row.status]}
                  </strong>
                  <p>
                    {row.start_time
                      ? `${displayTime(row.start_time)}–${displayTime(row.end_time)}`
                      : 'Whole day'}
                  </p>
                  <p>
                    {
                      (Array.isArray(row.hall_booking_details)
                        ? row.hall_booking_details[0]
                        : row.hall_booking_details
                      )?.event_title
                    }
                  </p>
                  <div className="booking-actions">
                    <button onClick={() => edit(row)}>Edit booking</button>
                    <button disabled={busy} onClick={() => remove(row)}>
                      Delete booking
                    </button>
                  </div>
                </article>
              ))}
        </div>
        <form className="booking-panel" onSubmit={save}>
          <h3>
            {selected.length === 1 ? fullDate(selected[0]) : `${selected.length} days selected`}
          </h3>
          {!selected.length && <p>Select a date on the calendar.</p>}
          <div className="booking-choices" role="group" aria-label="Day status">
            {HALL_STATUSES.map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={form.status === key}
                onClick={() => update('status', key)}
              >
                <i className="booking-dot" style={{ '--day-colour': colours[key] }} />
                {label}
              </button>
            ))}
          </div>
          <div className="booking-fields">
            <label className="booking-field">
              Start time
              <input
                type="time"
                value={form.start_time}
                onChange={(event) => update('start_time', event.target.value)}
              />
            </label>
            <label className="booking-field">
              Finish time
              <input
                type="time"
                value={form.end_time}
                onChange={(event) => update('end_time', event.target.value)}
              />
            </label>
          </div>
          <p>Leave times empty for the whole day.</p>
          <label className="booking-field">
            Booked for
            <input
              maxLength={160}
              value={form.event_title}
              onChange={(event) => update('event_title', event.target.value)}
              placeholder="e.g. Family celebration"
            />
          </label>
          <label className="booking-field">
            Contact name
            <input
              maxLength={120}
              value={form.contact_name}
              onChange={(event) => update('contact_name', event.target.value)}
            />
          </label>
          <div className="booking-fields">
            <label className="booking-field">
              Phone
              <input
                type="tel"
                maxLength={80}
                value={form.contact_phone}
                onChange={(event) => update('contact_phone', event.target.value)}
              />
            </label>
            <label className="booking-field">
              Email
              <input
                type="email"
                maxLength={254}
                value={form.contact_email}
                onChange={(event) => update('contact_email', event.target.value)}
              />
            </label>
          </div>
          <label className="booking-field">
            Staff notes
            <textarea
              rows={3}
              maxLength={3000}
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
            />
          </label>
          <p>Booking details stay in admin.</p>
          <div className="booking-actions">
            <button className="primary" disabled={busy || !selected.length || loading}>
              {busy
                ? 'Saving…'
                : `Save ${selected.length === 1 ? 'day' : `${selected.length} days`}`}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
