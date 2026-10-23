import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Moon, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import { fullDate, seasonDays } from '@/lib/bookingCalendar';
import { money, toPence } from '@/features/operations/model';
import { printTable } from '@/lib/printTable';
import useRamadanCalendar from './useRamadanCalendar';
import { RAMADAN_KINDS, RAMADAN_COLOURS, ramadanDay, ramadanStatus } from './model';
import '@/styles/ramadan.css';

export default function RamadanPage({ kind = null }) {
  const state = useRamadanCalendar(),
    season = state.data?.season;
  const days = useMemo(() => seasonDays(season), [season]);
  const [month, setMonth] = useState(() => new Date()),
    [selected, setSelected] = useState([]),
    [name, setName] = useState(''),
    [contact, setContact] = useState(''),
    [amount, setAmount] = useState(''),
    [showName, setShowName] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [receipt, setReceipt] = useState('');
  const requestKey = useRef(crypto.randomUUID()),
    table = useRef(null);
  useEffect(() => {
    if (!season?.id) return;
    setMonth(new Date(`${season.start_date}T12:00:00`));
    setSelected([]);
    setReceipt('');
    requestKey.current = crypto.randomUUID();
    setAmount(
      kind === 'daily'
        ? '5'
        : season.iftar_target_pence
          ? String(season.iftar_target_pence / 100)
          : '',
    );
  }, [season?.id, season?.start_date, season?.iftar_target_pence, kind]);
  const validDates = new Set(days.map((day) => day.date));
  const eligible = days.filter(
    (day) => kind !== 'iftar' || ramadanDay(state.data, kind, day.date).status !== 'confirmed',
  );
  async function submit(event) {
    event.preventDefault();
    if (busy || !selected.length) return;
    setError('');
    let pence = 0;
    try {
      pence = amount ? toPence(amount) : 0;
      if (kind === 'daily' && !pence) throw new Error('Enter your amount per day.');
    } catch (failure) {
      setError(failure.message);
      state.refresh();
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
    } finally {
      setBusy(false);
    }
  }
  const title = kind ? RAMADAN_KINDS[kind] : 'Ramadan';
  return (
    <div className="booking-workspace">
      <header>
        <h1>{title}</h1>
        <p>
          {kind === 'iftar'
            ? 'Choose your Iftar day and send a sponsorship request.'
            : kind === 'daily'
              ? 'Choose the days you would like to support.'
              : 'Share the blessings of Ramadan.'}
        </p>
      </header>
      {!kind && (
        <div className="ramadan-options">
          {Object.entries(RAMADAN_KINDS).map(([key, label]) => (
            <Link
              className="booking-panel ramadan-option"
              key={key}
              to={key === 'iftar' ? '/ramadan/iftar' : '/ramadan/daily-giving'}
            >
              {key === 'iftar' ? <Moon size={24} /> : <Heart size={24} />}
              <strong>{label}</strong>
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
      )}
      {state.loading && !season && <p role="status">Loading calendar…</p>}
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
          <h2>Calendar coming soon</h2>
          <p>The centre will publish its Ramadan dates here.</p>
          <Link className="booking-button" to="/contact">
            Contact the centre
          </Link>
        </section>
      )}
      {season && kind && (
        <>
          <div className="booking-layout">
            <div className="booking-panel">
              <h2>{season.title}</h2>
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                selected={selected}
                onSelect={(date) => {
                  if (receipt) return;
                  setSelected((current) =>
                    current.includes(date)
                      ? current.filter((value) => value !== date)
                      : [...current, date],
                  );
                }}
                disabled={busy || !!receipt}
                dayInfo={(date) => {
                  const day = ramadanDay(state.data, kind, date);
                  return {
                    label: validDates.has(date) ? ramadanStatus(kind, day.status) : '—',
                    colour: RAMADAN_COLOURS[day.status],
                    disabled:
                      !validDates.has(date) || (kind === 'iftar' && day.status === 'confirmed'),
                  };
                }}
              />
              <div className="booking-key">
                {['available', 'pending', 'confirmed'].map((status) => (
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
                  <button
                    disabled={busy}
                    onClick={() => setSelected(eligible.map((day) => day.date))}
                  >
                    {kind === 'daily' ? 'All Ramadan' : 'Select available days'}
                  </button>
                  <button disabled={busy} onClick={() => setSelected([])}>
                    Clear selection
                  </button>
                </div>
              )}
            </div>
            {receipt ? (
              <section className="booking-panel" role="status">
                <h2>Request received</h2>
                <p>The team will contact you to confirm.</p>
                <strong>{receipt}</strong>
                <div className="booking-actions">
                  <button
                    onClick={() => {
                      setReceipt('');
                      setSelected([]);
                      requestKey.current = crypto.randomUUID();
                    }}
                  >
                    Make another request
                  </button>
                </div>
              </section>
            ) : (
              <form className="booking-panel" onSubmit={submit}>
                <h2>
                  {selected.length
                    ? `${selected.length} ${selected.length === 1 ? 'day' : 'days'} selected`
                    : 'Select your days'}
                </h2>
                {selected.length > 0 && (
                  <p>
                    {selected.length === 1
                      ? fullDate(selected[0])
                      : `${fullDate([...selected].sort()[0])} + ${selected.length - 1} more`}
                  </p>
                )}
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
                    autoComplete="off"
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                  />
                </label>
                <label className="booking-field">
                  Amount per day (£{kind === 'iftar' ? ', optional' : ''})
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
                  Show my name on the public sponsorship board
                </label>
                {error && <p role="alert">{error}</p>}
                <div className="booking-actions">
                  <button className="primary" disabled={busy || !selected.length}>
                    {busy ? 'Sending…' : 'Send request'}
                  </button>
                </div>
                <p>The team will arrange sponsorship and payment with you.</p>
              </form>
            )}
          </div>
          <section className="booking-panel ramadan-public-table">
            <div className="booking-actions">
              <h2>{kind === 'iftar' ? 'Iftar sponsorships' : 'Daily Giving calendar'}</h2>
              <button
                onClick={() => {
                  try {
                    printTable(table.current, `${season.title} — ${title}`);
                  } catch (failure) {
                    setError(failure.message);
                  }
                }}
              >
                Print table
              </button>
            </div>
            <div className="booking-table-wrap">
              <table className="booking-table" ref={table}>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Sponsor</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const entry = ramadanDay(state.data, kind, day.date);
                    return (
                      <tr key={day.date}>
                        <td>{day.number}</td>
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
          </section>
        </>
      )}
    </div>
  );
}
