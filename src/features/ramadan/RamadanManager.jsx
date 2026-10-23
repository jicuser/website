import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import SponsorshipDays from './SponsorshipDays';
import SponsorshipRange from './SponsorshipRange';
import RamadanOptions from './RamadanOptions';
import { daysInRange, fullDate, seasonDays, seasonLength } from '@/lib/bookingCalendar';
import { collectPages } from '@/lib/formDownloads';
import { printTable } from '@/lib/printTable';
import { money, toPence } from '@/features/operations/model';
import { RAMADAN_COLOURS, RAMADAN_KINDS } from './model';
import '@/styles/ramadan.css';

const blankSeason = {
  title: 'Ramadan',
  start_date: '',
  day_count: 30,
  iftar_amount: '',
  suhoor_amount: '',
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
    [daySettings, setDaySettings] = useState([]),
    [manageDays, setManageDays] = useState(false),
    [selected, setSelected] = useState(''),
    [form, setForm] = useState(blankSponsor),
    [editing, setEditing] = useState(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [filter, setFilter] = useState('all'),
    [dayView, setDayView] = useState('table'),
    [range, setRange] = useState({});
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
      setError('Could not load Ramadan sponsorships.');
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
      suhoor_amount: season.suhoor_target_pence ? String(season.suhoor_target_pence / 100) : '',
      daily_amount: season.daily_target_pence ? String(season.daily_target_pence / 100) : '',
    });
    setSelected('');
    setRange({});
    setEditing(null);
    setForm(blankSponsor);
  }, [season]);
  const loadRecords = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!allowed || !seasonId) {
      setRecords([]);
      setDaySettings([]);
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
      const settings = await supabase
        .from('ramadan_day_settings')
        .select('kind,day_date,enabled')
        .eq('season_id', seasonId);
      if (settings.error) throw settings.error;
      if (version === loadVersion.current) {
        setRecords(data);
        setDaySettings(settings.data || []);
      }
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
  const dayEnabled = (date) =>
    daySettings.find((row) => row.kind === kind && row.day_date === date)?.enabled !== false;
  async function toggleDays(dates, enabled) {
    await act(async () => {
      const result = await supabase.rpc('save_ramadan_days', {
        p_season: seasonId,
        p_kind: kind,
        p_dates: dates,
        p_enabled: enabled,
      });
      if (result.error || result.data !== dates.length)
        throw new Error(result.error?.message || 'Days were not saved.');
      await loadRecords();
      setMessage(
        `${dates.length === 1 ? 'Day' : `${dates.length} days`} ${enabled ? 'opened' : 'closed'}.`,
      );
    });
  }
  function selectDay(date) {
    setSelected(date);
    setEditing(null);
    setForm({
      ...blankSponsor,
      amount: kind === 'suhoor' ? setup.suhoor_amount : kind === 'iftar' ? setup.iftar_amount : '',
    });
  }
  function edit(row) {
    setKind(row.kind);
    setSelected(row.day_date);
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
        suhoor_target_pence: setup.suhoor_amount ? toPence(setup.suhoor_amount) : 0,
        daily_target_pence: setup.daily_amount ? toPence(setup.daily_amount) : 0,
        published: setup.published,
      };
      const result = await supabase.rpc('save_ramadan_season', { p_body: payload });
      if (result.error || !result.data)
        throw new Error(result.error?.message || 'Setup was not saved.');
      await loadSeasons(result.data);
      setSetupOpen(false);
      setMessage('Sponsorship setup saved.');
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
  const visibleDays = daysInRange(days, range);
  const setupDays = seasonDays(setup);
  const printRows = visibleDays.flatMap((day) => {
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
              <span className="sr-only">Ramadan sponsorships</span>
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
                  suhoor_amount: season.suhoor_target_pence
                    ? String(season.suhoor_target_pence / 100)
                    : '',
                  daily_amount: season.daily_target_pence
                    ? String(season.daily_target_pence / 100)
                    : '',
                });
            }}
          >
            Sponsorship setup
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
      <RamadanOptions />
      {(setupOpen || !season) && (
        <form className="booking-panel" onSubmit={saveSetup}>
          <h3>Sponsorship setup</h3>
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
              First UK date · 1 Ramadan
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
              Last UK date
              <input
                type="date"
                required
                disabled={!setup.start_date}
                value={setupDays.at(-1)?.date || ''}
                min={seasonDays({ ...setup, day_count: 29 }).at(-1)?.date || undefined}
                max={seasonDays({ ...setup, day_count: 30 }).at(-1)?.date || undefined}
                onChange={(event) => {
                  try {
                    const count = seasonLength(setup.start_date, event.target.value);
                    setSetup((current) => ({ ...current, day_count: count }));
                    setError('');
                  } catch (failure) {
                    setError(failure.message);
                  }
                }}
              />
            </label>
            <label className="booking-field">
              Suhoor target per day (£, optional)
              <input
                inputMode="decimal"
                value={setup.suhoor_amount}
                onChange={(event) =>
                  setSetup((current) => ({ ...current, suhoor_amount: event.target.value }))
                }
              />
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
          {setupDays.length > 0 && (
            <p className="sponsorship-date-summary">
              1 Ramadan · {fullDate(setupDays[0].date)} → {setup.day_count} Ramadan ·{' '}
              {fullDate(setupDays.at(-1).date)}
            </p>
          )}
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
              Save setup
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
                setDayView('table');
              }}
            >
              Open requests
            </button>
          </div>
          {!season.published && (
            <p>
              These sponsorships are a draft. Publish in Sponsorship setup to show it on the website
              and screens.
            </p>
          )}
          <div className="booking-layout">
            <div className="booking-panel">
              {loading && <p role="status">Loading sponsorships…</p>}
              <div
                className="booking-choices sponsorship-view-choice"
                role="group"
                aria-label="Sponsorship view"
              >
                {[
                  ['table', 'Table'],
                  ['days', 'Days'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={dayView === value}
                    disabled={busy}
                    onClick={() => setDayView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <SponsorshipRange
                days={days}
                value={range}
                onChange={setRange}
                disabled={busy || loading}
              />
              <div className="booking-actions">
                <button
                  type="button"
                  aria-pressed={manageDays}
                  disabled={busy}
                  onClick={() => {
                    setManageDays((value) => !value);
                    setDayView('days');
                  }}
                >
                  {manageDays ? 'Done opening / closing days' : 'Open or close days'}
                </button>
                <>
                  <button
                    disabled={busy || loading || !visibleDays.length}
                    onClick={() =>
                      toggleDays(
                        visibleDays.map((day) => day.date),
                        true,
                      )
                    }
                  >
                    Open this range
                  </button>
                  <button
                    disabled={busy || loading || !visibleDays.length}
                    onClick={() =>
                      toggleDays(
                        visibleDays.map((day) => day.date),
                        false,
                      )
                    }
                  >
                    Close this range
                  </button>
                </>
                {manageDays && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        toggleDays(
                          days.map((day) => day.date),
                          true,
                        )
                      }
                    >
                      Open all days
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        toggleDays(
                          days.map((day) => day.date),
                          false,
                        )
                      }
                    >
                      Close all days
                    </button>
                  </>
                )}
              </div>
              <div hidden={dayView !== 'table'}>
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
                        <th>Ramadan day</th>
                        <th>UK date</th>
                        <th>Status</th>
                        <th>Sponsor</th>
                        <th>Contact</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th data-print-exclude="true">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!printRows.length && (
                        <tr>
                          <td colSpan={8}>No sponsorships match this range and status.</td>
                        </tr>
                      )}
                      {printRows.map(({ number, date, row }, index) => (
                        <tr
                          key={row?.id || `${date}-${index}`}
                          className={selected === date ? 'is-selected' : undefined}
                        >
                          <td>{number} Ramadan</td>
                          <td>{fullDate(date)}</td>
                          <td>
                            <span
                              className="booking-dot"
                              aria-hidden="true"
                              style={{
                                '--day-colour':
                                  RAMADAN_COLOURS[
                                    row?.status === 'confirmed'
                                      ? 'confirmed'
                                      : row?.status === 'pending'
                                        ? 'pending'
                                        : row?.status === 'cancelled' || !dayEnabled(date)
                                          ? 'closed'
                                          : 'available'
                                  ],
                              }}
                            />{' '}
                            {row
                              ? statusLabel[row.status]
                              : dayEnabled(date)
                                ? 'Available'
                                : 'Closed'}
                          </td>
                          <td>{row?.sponsor_name || '—'}</td>
                          <td>{[row?.phone, row?.email].filter(Boolean).join(' / ') || '—'}</td>
                          <td>{row ? money(row.amount_pence) : '—'}</td>
                          <td>{row ? (row.paid ? 'Received' : 'Not recorded') : '—'}</td>
                          <td data-print-exclude="true">
                            <button
                              type="button"
                              className="booking-button"
                              disabled={busy || loading}
                              onClick={() => (row ? edit(row) : selectDay(date))}
                            >
                              {row ? 'Edit' : 'Add sponsor'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {dayView === 'days' && (
                <SponsorshipDays
                  days={visibleDays}
                  kind={kind}
                  selected={selected ? [selected] : []}
                  manage={manageDays}
                  disabled={busy || loading}
                  onSelect={(date) =>
                    manageDays ? toggleDays([date], !dayEnabled(date)) : selectDay(date)
                  }
                  dayInfo={(date) => {
                    const entries = current.filter(
                      (row) => row.day_date === date && row.status !== 'cancelled',
                    );
                    return {
                      enabled: dayEnabled(date),
                      status: !dayEnabled(date)
                        ? 'closed'
                        : entries.some((row) => row.status === 'confirmed')
                          ? 'confirmed'
                          : entries.length
                            ? 'pending'
                            : 'available',
                    };
                  }}
                />
              )}
              <div className="booking-actions">
                <Link
                  to={`/ramadan/display?kind=${kind}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open screen display
                </Link>
                {auth.can('tv') && <Link to="/admin?section=tv">Choose TV layout</Link>}
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
              <h3>
                {selected
                  ? `${days.find((day) => day.date === selected)?.number} Ramadan · ${fullDate(selected)}`
                  : 'Select a day'}
              </h3>
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
        </>
      )}
    </section>
  );
}
