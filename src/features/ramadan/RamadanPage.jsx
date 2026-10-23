import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Moon, Sun, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useContent } from '@/context/ContentContext';
import { isPageVisible } from '@/lib/pageVisibility';
import { daysInRange, fullDate, seasonDays } from '@/lib/bookingCalendar';
import { money, toPence } from '@/features/operations/model';
import { printTable } from '@/lib/printTable';
import SponsorshipDays from './SponsorshipDays';
import SponsorshipRange from './SponsorshipRange';
import SponsorshipTable from './SponsorshipTable';
import useRamadanCalendar from './useRamadanCalendar';
import {
  RAMADAN_KINDS,
  RAMADAN_PATHS,
  RAMADAN_COLOURS,
  canSponsorDay,
  ramadanDay,
  ramadanOpen,
  ramadanStatus,
} from './model';

const icons = { iftar: Moon, suhoor: Sun, daily: Heart };
export default function RamadanPage({ kind = null }) {
  const state = useRamadanCalendar(true),
    season = state.data?.season;
  const { getContent } = useContent();
  const days = useMemo(() => seasonDays(season), [season]);
  const [selected, setSelected] = useState([]),
    [range, setRange] = useState({}),
    [dayView, setDayView] = useState('days'),
    [name, setName] = useState(''),
    [contact, setContact] = useState(''),
    [amount, setAmount] = useState(''),
    [showName, setShowName] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [receipt, setReceipt] = useState('');
  const requestKey = useRef(crypto.randomUUID()),
    table = useRef(null);
  const target = season?.[`${kind}_target_pence`] || 0;
  useEffect(() => {
    setSelected([]);
    setRange({});
    setReceipt('');
    setError('');
    requestKey.current = crypto.randomUUID();
    setAmount(kind === 'daily' ? '5' : target ? String(target / 100) : '');
  }, [season?.id, season?.start_date, target, kind]);
  useEffect(() => {
    if (receipt || busy) return;
    setSelected((current) => {
      const available = current.filter((date) => canSponsorDay(state.data, kind, date));
      return available.length === current.length ? current : available;
    });
  }, [state.data, kind, receipt, busy]);
  const choices = Object.entries(RAMADAN_KINDS).filter(
    ([key]) => ramadanOpen(state.data, key) && isPageVisible(getContent, RAMADAN_PATHS[key]),
  );
  const eligible = days.filter((day) => canSponsorDay(state.data, kind, day.date));
  const open = kind && ramadanOpen(state.data, kind);
  const visibleDays = daysInRange(days, range);
  const selectDay = (date) => {
    if (busy || receipt) return;
    setSelected((current) =>
      current.includes(date) ? current.filter((value) => value !== date) : [...current, date],
    );
  };
  const dayInfo = (date) => ({
    ...ramadanDay(state.data, kind, date),
    disabled: !canSponsorDay(state.data, kind, date),
  });
  async function submit(event) {
    event.preventDefault();
    if (busy || !selected.length || !open) return;
    setError('');
    let pence;
    try {
      pence = amount ? toPence(amount) : 0;
      if (kind === 'daily' && !pence) throw new Error('Enter your amount per day.');
    } catch (failure) {
      setError(failure.message);
      return;
    }
    setBusy(true);
    try {
      const email = contact.includes('@') ? contact.trim() : '',
        phone = email ? '' : contact.trim();
      const result = await supabase.functions.invoke('ramadan-request', {
        body: {
          season_id: season.id,
          kind,
          dates: selected,
          sponsor_name: name.trim(),
          phone,
          email,
          amount_pence: pence,
          show_name: showName,
          consent: true,
          request_key: requestKey.current,
        },
      });
      if (result.error) {
        let message = 'Your request was not saved. Please try again.';
        try {
          message = (await result.error.context.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      if (!result.data?.reference)
        throw new Error('The receipt could not be confirmed. Please try again.');
      setReceipt(result.data.reference);
      state.refresh();
    } catch (failure) {
      setError(failure.message);
      state.refresh();
    } finally {
      setBusy(false);
    }
  }
  const title = kind ? RAMADAN_KINDS[kind] : 'Ramadan';
  return (
    <div className="booking-workspace sponsorship-page">
      <header>
        <span className="sponsorship-eyebrow">
          {kind ? 'RAMADAN · GIVE TOGETHER' : 'RAMADAN AT THE CENTRE'}
        </span>
        <h1>{title}</h1>
        <p>
          {kind === 'daily'
            ? 'Choose the days you would like to support.'
            : kind
              ? 'Choose a day to sponsor a meal.'
              : 'Prayer times, meal sponsorships and daily giving.'}
        </p>
      </header>
      {!kind && (
        <section
          className="booking-panel ramadan-timetable-notice"
          aria-labelledby="ramadan-timetable-heading"
        >
          <h2 id="ramadan-timetable-heading">Ramadan timetable coming soon</h2>
          <p>Prayer, Suhoor and Iftar times will be shared here once confirmed.</p>
        </section>
      )}
      {(!state.loading || season) && choices.length > 0 && (
        <nav className="sponsorship-kind-links" aria-label="Ramadan sponsorship options">
          {choices.map(([key, label]) => {
            const Icon = icons[key];
            return (
              <Link
                key={key}
                to={RAMADAN_PATHS[key]}
                aria-current={kind === key ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                <ArrowRight size={16} />
              </Link>
            );
          })}
        </nav>
      )}
      {state.loading && !season && <p role="status">Loading sponsorships…</p>}
      {state.error && (
        <p role="alert">
          {state.error}{' '}
          <button className="booking-button" onClick={state.refresh}>
            Try again
          </button>
        </p>
      )}
      {!state.loading && !state.error && !season && (
        <section className="booking-panel">
          <h2>Meal bookings coming soon</h2>
          <p>The centre will open sponsorship days here.</p>
          <Link className="booking-button" to="/contact">
            Contact the centre
          </Link>
        </section>
      )}
      {season && kind && !open && (
        <section className="booking-panel">
          <h2>Bookings are closed</h2>
          <p>Please choose another sponsorship option or contact the centre.</p>
          <Link className="booking-button" to="/ramadan">
            View sponsorships
          </Link>
        </section>
      )}
      {season && kind && open && (
        <>
          <div className="booking-layout">
            <section className="booking-panel">
              <div className="sponsorship-days-heading">
                <h2>Choose your days</h2>
                <span>
                  {eligible.length} {kind === 'daily' ? 'days open' : 'days available'}
                </span>
              </div>
              <div
                className="booking-choices sponsorship-view-choice"
                role="group"
                aria-label="Sponsorship view"
              >
                {[
                  ['days', 'Days'],
                  ['table', 'Table'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={dayView === value}
                    onClick={() => setDayView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <details className="sponsorship-range-options">
                <summary>Choose a date range</summary>
                <SponsorshipRange
                  days={days}
                  value={range}
                  onChange={setRange}
                  disabled={busy || !!receipt}
                  onSelect={(dates) => {
                    const available = dates.filter((date) => canSponsorDay(state.data, kind, date));
                    setSelected((current) => [...new Set([...current, ...available])]);
                  }}
                />
              </details>
              {dayView === 'table' ? (
                <SponsorshipTable
                  days={visibleDays}
                  kind={kind}
                  selected={selected}
                  onSelect={selectDay}
                  dayInfo={dayInfo}
                  disabled={busy || !!receipt}
                />
              ) : (
                <SponsorshipDays
                  days={visibleDays}
                  kind={kind}
                  selected={selected}
                  onSelect={selectDay}
                  disabled={busy || !!receipt}
                  dayInfo={dayInfo}
                />
              )}
              <div className="booking-key">
                {['available', 'pending', 'confirmed', 'closed'].map((status) => (
                  <span key={status}>
                    <i
                      className="booking-dot"
                      style={{ '--day-colour': RAMADAN_COLOURS[status] }}
                    />
                    {ramadanStatus(kind, status)}
                  </span>
                ))}
              </div>
              {!receipt && (
                <div className="booking-actions">
                  {kind === 'daily' && (
                    <button
                      disabled={busy}
                      onClick={() => setSelected(eligible.map((day) => day.date))}
                    >
                      Choose all open days
                    </button>
                  )}
                  <button disabled={busy || !selected.length} onClick={() => setSelected([])}>
                    Clear selection
                  </button>
                </div>
              )}
            </section>
            {receipt ? (
              <section className="booking-panel sponsorship-receipt" role="status">
                <h2>Booking request received</h2>
                <p>The team will contact you to confirm your sponsorship.</p>
                <strong>{receipt}</strong>
                <div className="booking-actions">
                  <button
                    onClick={() => {
                      setReceipt('');
                      setSelected([]);
                      requestKey.current = crypto.randomUUID();
                    }}
                  >
                    {kind === 'daily' ? 'Make another request' : 'Sponsor another meal'}
                  </button>
                </div>
              </section>
            ) : (
              <form className="booking-panel sponsorship-request" onSubmit={submit}>
                <h2>
                  {selected.length
                    ? `${selected.length} ${selected.length === 1 ? 'day' : 'days'} selected`
                    : 'Your sponsorship'}
                </h2>
                <p>
                  {selected.length === 1
                    ? fullDate(selected[0])
                    : selected.length
                      ? `${fullDate([...selected].sort()[0])} + ${selected.length - 1} more`
                      : 'Tap an available day to get started.'}
                </p>
                <label className="booking-field">
                  Your name
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="booking-field">
                  Phone or email
                  <input
                    required
                    maxLength={254}
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                  />
                </label>
                <label className="booking-field">
                  Amount per day (£{kind === 'daily' ? '' : ', optional'})
                  <input
                    required={kind === 'daily'}
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                {amount && /^\d+(\.\d{1,2})?$/.test(amount) && selected.length > 1 && (
                  <p>Total pledge: {money(Math.round(Number(amount) * 100) * selected.length)}</p>
                )}
                <label className="ramadan-check">
                  <input
                    type="checkbox"
                    checked={showName}
                    onChange={(event) => setShowName(event.target.checked)}
                  />{' '}
                  Show my name on the sponsorship board
                </label>
                <div className="booking-actions">
                  <button className="primary" disabled={busy || !selected.length}>
                    {busy ? 'Sending…' : 'Request sponsorship'}
                  </button>
                </div>
                <small>The team will arrange confirmation and payment.</small>
              </form>
            )}
          </div>
          {error && <p role="alert">{error}</p>}
          <details className="booking-panel ramadan-public-table">
            <summary>Sponsorship list & print</summary>
            <div className="booking-actions">
              <button
                onClick={() => {
                  try {
                    printTable(table.current, `${season.title} — ${title}`);
                  } catch (failure) {
                    setError(failure.message);
                  }
                }}
              >
                Print sponsorships
              </button>
            </div>
            <div className="booking-table-wrap">
              <table className="booking-table" ref={table}>
                <thead>
                  <tr>
                    <th>Ramadan day</th>
                    <th>UK date</th>
                    <th>Status</th>
                    <th>Sponsor</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDays.map((day) => {
                    const entry = ramadanDay(state.data, kind, day.date);
                    return (
                      <tr key={day.date}>
                        <td>{day.number} Ramadan</td>
                        <td>{fullDate(day.date)}</td>
                        <td>{ramadanStatus(kind, entry.status)}</td>
                        <td>
                          {entry.names?.join(', ') ||
                            (Number(entry.confirmed) > 0 ? 'Anonymous' : '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
