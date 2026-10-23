import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { hallDateStatus, hallMonthRange } from '@/lib/serviceEnquiries';
import { CALENDAR_COLOURS, HALL_STATUSES, fullDate } from '@/lib/bookingCalendar';
import { displayTime, londonDate } from '@/lib/timetable';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import ManagedPageContent from '@/components/ManagedPageContent';
import ManagedPageSections from '@/components/ManagedPageSections';
import { useContent } from '@/context/ContentContext';
import { HALL_DETAILS_KEY, readHallDetails } from '@/lib/hallDetails';

const labels = {
  available: 'Available',
  pending: 'Provisional',
  booked: 'Booked',
  closed: 'Closed',
  unknown: 'Ask us',
  partial: 'Times',
};
export default function HallBookingPage() {
  const { getContent } = useContent();
  const details = readHallDetails(getContent(HALL_DETAILS_KEY, null));
  const hasDetails =
    details.description || details.capacity || details.facilities.length || details.photos.length;
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
  const canEnquire = selected && !loading && !error && !['booked', 'closed'].includes(state);
  return (
    <div className="booking-workspace hall-booking-page">
      <header>
        <h1>Hall booking</h1>
        <p>
          Check a date and tell us about your event. The office will confirm availability and your
          booking.
        </p>
      </header>
      {hasDetails ? (
        <section className="hall-details" aria-labelledby="hall-details-title">
          <div className="hall-details-copy">
            <h2 id="hall-details-title">About the hall</h2>
            {details.description && <p>{details.description}</p>}
            {(details.capacity || details.facilities.length > 0) && (
              <div className="hall-details-facts">
                {details.capacity && (
                  <div>
                    <h3>Capacity</h3>
                    <p>{details.capacity}</p>
                  </div>
                )}
                {details.facilities.length > 0 && (
                  <div>
                    <h3>Facilities</h3>
                    <ul>
                      {details.facilities.map((facility, index) => (
                        <li key={index}>{facility}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          {details.photos.length > 0 && (
            <div className="hall-details-gallery">
              {details.photos.map((photo, index) => (
                <img
                  key={`${photo.url}-${index}`}
                  src={photo.url}
                  alt={photo.alt || 'JIC hall photograph'}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
      <div className="hall-page-content">
        <ManagedPageContent optional headingLevel={2} />
        <ManagedPageSections />
      </div>
      <section className="hall-booking-dates" aria-labelledby="hall-date-heading">
        <div className="hall-step-heading">
          <span aria-hidden="true">1</span>
          <div>
            <h2 id="hall-date-heading">Choose your date</h2>
            <p>
              Check the calendar, then send an enquiry with your preferred time and event details.
            </p>
          </div>
        </div>
        {error && (
          <p role="alert">
            {error}{' '}
            <button className="booking-button" onClick={() => setRevision((value) => value + 1)}>
              Try again
            </button>
          </p>
        )}
        <div className="booking-layout">
          <div className="booking-panel hall-calendar" aria-busy={loading}>
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
          <section
            className={`booking-panel hall-enquiry ${selected ? 'has-date' : ''}`}
            aria-label="Your hall enquiry"
            aria-live="polite"
          >
            <h2 className="hall-step-label">2 · Send an enquiry</h2>
            <h3 className="hall-selected-date">
              {selected ? (
                <time dateTime={selected}>{fullDate(selected)}</time>
              ) : (
                'Your selected date'
              )}
            </h3>
            {selected ? (
              <>
                <p>
                  <strong>{state === 'partial' ? 'Times on this date' : labels[state]}</strong>
                </p>
                {entries
                  .filter((row) => row.start_time)
                  .map((row, index) => (
                    <p key={index}>
                      {displayTime(row.start_time)}–{displayTime(row.end_time)} ·{' '}
                      {labels[row.status]}
                    </p>
                  ))}
                {state === 'unknown' && <p>The team will check availability for you.</p>}
                {state === 'pending' && (
                  <p>A provisional booking is being checked. You can ask about other times.</p>
                )}
                {state === 'partial' && (
                  <p>Some times have bookings. Include your preferred time in your enquiry.</p>
                )}
                {['booked', 'closed'].includes(state) && <p>Please choose another date.</p>}
              </>
            ) : (
              <p>Select a day on the calendar to see its availability and start your enquiry.</p>
            )}
            {canEnquire && (
              <>
                <p>
                  Tell us your preferred time, event and guest numbers. The office will confirm the
                  details.
                </p>
                <div className="booking-actions">
                  <Link className="primary" to={`/forms/hall-booking?date=${selected}`}>
                    Enquire about this date
                  </Link>
                </div>
              </>
            )}
            <div className="booking-actions">
              <Link to="/contact">Contact the office</Link>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
