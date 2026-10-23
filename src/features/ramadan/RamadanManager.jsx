import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import MonthCalendar from '@/components/calendar/MonthCalendar';
import { fullDate, seasonDays } from '@/lib/bookingCalendar';
import { collectPages } from '@/lib/formDownloads';
import { printTable } from '@/lib/printTable';
import { money, toPence } from '@/features/operations/model';
import { RAMADAN_KINDS, RAMADAN_COLOURS } from './model';
import '@/styles/ramadan.css';

const blankSeason = {
  title: 'Ramadan',
  start_date: '',
  day_count: 30,
  iftar_amount: '',
  daily_amount: '',
  published: false,
};
const blankSponsor = {
  sponsor_name: '',
  phone: '',
  email: '',
  public_name: '',
  amount: '',
  status: 'confirmed',
  paid: false,
  notes: '',
};
const statusLabel = { pending: 'Requested', confirmed: 'Confirmed', cancelled: 'Cancelled' };
export default function RamadanManager() {
  const auth = useAuth(),
    allowed = auth.can('ramadan');
  const [seasons, setSeasons] = useState([]),
    [seasonId, setSeasonId] = useState(''),
    [records, setRecords] = useState([]),
    [setup, setSetup] = useState(blankSeason),
    [setupOpen, setSetupOpen] = useState(false),
    [kind, setKind] = useState('iftar'),
    [month, setMonth] = useState(() => new Date()),
    [selected, setSelected] = useState(''),
    [form, setForm] = useState(blankSponsor),
    [editing, setEditing] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [filter, setFilter] = useState('all'),
    [showTable, setShowTable] = useState(false);
  const table = useRef(null),
    loadVersion = useRef(0);
  const loadSeasons = useCallback(async (preferred) => {
    const result = await supabase
      .from('ramadan_seasons')
      .select('*')
      .order('start_date', { ascending: false });
    if (result.error) throw result.error;
    const values = result.data || [];
    setSeasons(values);
    setSeasonId(
      (current) =>
        preferred || current || values.find((value) => value.published)?.id || values[0]?.id || '',
    );
    if (!values.length) setSetupOpen(true);
  }, []);
  useEffect(() => {
    if (!allowed) return;
    loadSeasons().catch(() => {
      setError('Could not load Ramadan calendars.');
      setLoading(false);
    });
  }, [allowed, loadSeasons]);
  const season = seasons.find((value) => value.id === seasonId);
  const days = useMemo(() => seasonDays(season), [season]);
  useEffect(() => {
    if (!season) {
      setSetup(blankSeason);
      setLoading(false);
      return;
    }
    setSetup({
      ...season,
      iftar_amount: season.iftar_target_pence ? String(season.iftar_target_pence / 100) : '',
      daily_amount: season.daily_target_pence ? String(season.daily_target_pence / 100) : '',
    });
    setMonth(new Date(`${season.start_date}T12:00:00`));
    setSelected('');
    setEditing(null);
    setForm(blankSponsor);
  }, [season]);
  const loadRecords = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!allowed || !seasonId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await collectPages(async (offset, size) => {
        const result = await supabase
          .from('ramadan_sponsorships')
          .select('*')
          .eq('season_id', seasonId)
          .order('day_date')
          .order('created_at')
          .order('id')
          .range(offset, offset + size - 1);
        if (result.error) throw result.error;
        return result.data || [];
      });
      if (version === loadVersion.current) setRecords(data);
    } catch {
      if (version === loadVersion.current) setError('Could not load sponsorships. Try refreshing.');
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [allowed, seasonId]);
  useEffect(() => {
    setRecords([]);
    loadRecords();
    return () => {
      loadVersion.current++;
    };
  }, [loadRecords]);
  async function act(work) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
    } catch (failure) {
      setError(failure.message || 'The change was not saved.');
    } finally {
      setBusy(false);
    }
  }
  const current = records.filter((row) => row.kind === kind && row.season_id === seasonId);
  const pending = current.filter((row) => row.status === 'pending').length;
  const validDates = new Set(days.map((day) => day.date));
  function selectDay(date) {
    setSelected(date);
    setEditing(null);
    setForm({ ...blankSponsor, amount: kind === 'iftar' ? setup.iftar_amount : '' });
  }
  function edit(row) {
    setKind(row.kind);
    setSelected(row.day_date);
    setMonth(new Date(`${row.day_date}T12:00:00`));
    setEditing(row.id);
    setForm({ ...row, amount: row.amount_pence ? String(row.amount_pence / 100) : '' });
  }
  async function saveSetup(event) {
    event.preventDefault();
    await act(async () => {
      const payload = {
        id: setup.id || null,
        title: setup.title,
        start_date: setup.start_date,
        day_count: Number(setup.day_count),
        iftar_target_pence: setup.iftar_amount ? toPence(setup.iftar_amount) : 0,
        daily_target_pence: setup.daily_amount ? toPence(setup.daily_amount) : 0,
        published: setup.published,
      };
      const result = await supabase.rpc('save_ramadan_season', { p_body: payload });
      if (result.error || !result.data)
        throw new Error(result.error?.message || 'Calendar was not saved.');
      await loadSeasons(result.data);
      setSetupOpen(false);
      setMessage('Calendar saved.');
    });
  }
  async function saveSponsor(event) {
    event.preventDefault();
    if (!selected) return;
    await act(async () => {
      const payload = {
        id: editing,
        season_id: seasonId,
        day_date: selected,
        kind,
        sponsor_name: form.sponsor_name,
        phone: form.phone,
        email: form.email,
        public_name: form.public_name,
        amount_pence: form.amount ? toPence(form.amount) : 0,
        status: form.status,
        paid: form.paid,
        notes: form.notes,
      };
      const result = await supabase.rpc('save_ramadan_sponsorship', { p_body: payload });
      if (result.error || !result.data)
        throw new Error(result.error?.message || 'Sponsorship was not saved.');
      await loadRecords();
      setEditing(result.data);
      setMessage('Sponsorship saved.');
    });
  }
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const printRows = days.flatMap((day) => {
    const entries = current.filter(
      (row) => row.day_date === day.date && (filter === 'all' || row.status === filter),
    );
    return entries.length ? entries.map((row) => ({ ...day, row })) : filter === 'all' ? [day] : [];
  });
  if (!allowed) return <p>Ramadan management access is required.</p>;
  return (
    <section className="booking-workspace" aria-label="Ramadan management">
      <header>
        <h2>Ramadan</h2>
        <div className="booking-actions">
          {seasons.length > 0 && (
            <label>
              <span className="sr-only">Ramadan calendar</span>
              <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
                {seasons.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.title}
                    {value.published ? ' · Live' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => {
              setSetupOpen((value) => !value);
              if (season)
                setSetup({
                  ...season,
                  iftar_amount: season.iftar_target_pence
                    ? String(season.iftar_target_pence / 100)
                    : '',
                  daily_amount: season.daily_target_pence
                    ? String(season.daily_target_pence / 100)
                    : '',
                });
            }}
          >
            Calendar setup
          </button>
          <button
            onClick={() => {
              setSetup(blankSeason);
              setSetupOpen(true);
            }}
          >
            New Ramadan
          </button>
          {season && (
            <button
              onClick={() => {
                try {
                  printTable(table.current, `${season.title} — ${RAMADAN_KINDS[kind]}`);
                } catch (failure) {
                  setError(failure.message);
                }
              }}
            >
              Print table
            </button>
          )}
          <Link to="/ramadan">View website</Link>
          <button onClick={loadRecords} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {(setupOpen || !season) && (
        <form className="booking-panel" onSubmit={saveSetup}>
          <h3>Calendar setup</h3>
          <div className="booking-fields">
            <label className="booking-field">
              Name
              <input
                required
                maxLength={120}
                value={setup.title}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className="booking-field">
              First day
              <input
                required
                type="date"
                value={setup.start_date}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, start_date: event.target.value }))
                }
              />
            </label>
            <label className="booking-field">
              Days
              <select
                value={setup.day_count}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, day_count: Number(event.target.value) }))
                }
              >
                <option value={29}>29 days</option>
                <option value={30}>30 days</option>
              </select>
            </label>
            <label className="booking-field">
              Iftar target per day (£, optional)
              <input
                inputMode="decimal"
                value={setup.iftar_amount}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, iftar_amount: event.target.value }))
                }
              />
            </label>
            <label className="booking-field">
              Daily Giving target (£, optional)
              <input
                inputMode="decimal"
                value={setup.daily_amount}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, daily_amount: event.target.value }))
                }
              />
            </label>
          </div>
          <label className="ramadan-check">
            <input
              type="checkbox"
              checked={setup.published}
              onChange={(event) =>
                setSetup((current) => ({ ...current, published: event.target.checked }))
              }
            />{' '}
            Show on the website and screens
          </label>
          <div className="booking-actions">
            <button className="primary" disabled={busy}>
              Save calendar
            </button>
            {season && (
              <button type="button" onClick={() => setSetupOpen(false)}>
                Close setup
              </button>
            )}
          </div>
        </form>
      )}
      {season && (
        <>
          <div className="booking-choices" role="group" aria-label="Ramadan area">
            {Object.entries(RAMADAN_KINDS).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={kind === key}
                onClick={() => {
                  setKind(key);
                  setEditing(null);
                  setForm(blankSponsor);
                  setFilter('all');
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="booking-summary">
            <span>
              <strong>{pending}</strong> requests
            </span>
            <span>
              <strong>{current.filter((row) => row.status === 'confirmed').length}</strong>{' '}
              confirmed
            </span>
            <span>
              <strong>
                {money(
                  current
                    .filter((row) => row.paid && row.status !== 'cancelled')
                    .reduce((total, row) => total + row.amount_pence, 0),
                )}
              </strong>{' '}
              recorded received
            </span>
            <button
              className="booking-button"
              onClick={() => {
                setFilter('pending');
                setShowTable(true);
              }}
            >
              Open requests
            </button>
          </div>
          {!season.published && (
            <p>
              This calendar is a draft. Publish it in Calendar setup to show it on the website and
              screens.
            </p>
          )}
          <div className="booking-layout">
            <div className="booking-panel">
              {loading && <p role="status">Loading sponsorships…</p>}
              <MonthCalendar
                month={month}
                onMonthChange={setMonth}
                selected={selected ? [selected] : []}
                onSelect={selectDay}
                disabled={busy || loading}
                dayInfo={(date) => {
                  const day = current.filter(
                    (row) => row.day_date === date && row.status !== 'cancelled',
                  );
                  const state = day.some((row) => row.status === 'confirmed')
                    ? 'confirmed'
                    : day.length
                      ? 'pending'
                      : 'available';
                  return {
                    label: validDates.has(date)
                      ? state === 'confirmed'
                        ? 'Confirmed'
                        : state === 'pending'
                          ? 'Requested'
                          : 'Available'
                      : '—',
                    colour: RAMADAN_COLOURS[state],
                    disabled: !validDates.has(date),
                  };
                }}
              />
              <div className="booking-actions">
                <Link
                  to={`/ramadan/display?kind=${kind}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open screen display
                </Link>
                {auth.can('tv') && <Link to="/admin?section=tv">Choose on centre screens</Link>}
              </div>
              {selected &&
                current
                  .filter((row) => row.day_date === selected)
                  .map((row) => (
                    <article className="booking-record" key={row.id}>
                      <strong>{row.sponsor_name}</strong>
                      <p>
                        {statusLabel[row.status]} · {money(row.amount_pence)} ·{' '}
                        {row.paid ? 'Payment received' : 'Payment not recorded'}
                      </p>
                      <p>{row.reference}</p>
                      <button className="booking-button" onClick={() => edit(row)}>
                        Edit sponsorship
                      </button>
                    </article>
                  ))}
            </div>
            <form className="booking-panel" onSubmit={saveSponsor}>
              <h3>{selected ? fullDate(selected) : 'Select a day'}</h3>
              <label className="booking-field">
                Sponsor name
                <input
                  required
                  maxLength={120}
                  value={form.sponsor_name}
                  onChange={(event) => update('sponsor_name', event.target.value)}
                />
              </label>
              <div className="booking-fields">
                <label className="booking-field">
                  Phone
                  <input
                    type="tel"
                    maxLength={80}
                    value={form.phone}
                    onChange={(event) => update('phone', event.target.value)}
                  />
                </label>
                <label className="booking-field">
                  Email
                  <input
                    type="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                  />
                </label>
              </div>
              <label className="booking-field">
                Amount (£)
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => update('amount', event.target.value)}
                />
              </label>
              <div className="booking-choices" role="group" aria-label="Sponsorship status">
                {Object.entries(statusLabel).map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={form.status === key}
                    onClick={() => update('status', key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="ramadan-check">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(event) => update('paid', event.target.checked)}
                />{' '}
                Payment received
              </label>
              <label className="booking-field">
                Public display name (optional)
                <input
                  maxLength={120}
                  value={form.public_name}
                  onChange={(event) => update('public_name', event.target.value)}
                />
                <small>Only add a name if the sponsor agrees.</small>
              </label>
              <label className="booking-field">
                Staff notes
                <textarea
                  rows={3}
                  maxLength={3000}
                  value={form.notes}
                  onChange={(event) => update('notes', event.target.value)}
                />
              </label>
              <div className="booking-actions">
                <button className="primary" disabled={busy || !selected}>
                  {busy ? 'Saving…' : editing ? 'Save changes' : 'Add sponsorship'}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setForm(blankSponsor);
                    }}
                  >
                    New sponsor
                  </button>
                )}
              </div>
            </form>
          </div>
          <details
            className="booking-panel"
            open={showTable}
            onToggle={(event) => setShowTable(event.currentTarget.open)}
          >
            <summary>All days & sponsorship table</summary>
            <div className="booking-actions">
              <label>
                Status{' '}
                <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                  <option value="all">All</option>
                  {Object.entries(statusLabel).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="booking-table-wrap">
              <table className="booking-table" ref={table}>
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Sponsor</th>
                    <th>Contact</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th data-print-exclude="true">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {printRows.map(({ number, date, row }, index) => (
                    <tr key={row?.id || `${date}-${index}`}>
                      <td>{number}</td>
                      <td>{fullDate(date)}</td>
                      <td>{row ? statusLabel[row.status] : 'Available'}</td>
                      <td>{row?.sponsor_name || '—'}</td>
                      <td>{[row?.phone, row?.email].filter(Boolean).join(' / ') || '—'}</td>
                      <td>{row ? money(row.amount_pence) : '—'}</td>
                      <td>{row ? (row.paid ? 'Received' : 'Not recorded') : '—'}</td>
                      <td data-print-exclude="true">
                        {row && <button onClick={() => edit(row)}>Edit</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
