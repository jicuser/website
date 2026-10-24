import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import SponsorshipMonth from './SponsorshipMonth';
import SponsorshipKey from './SponsorshipKey';
import SponsorshipRange from './SponsorshipRange';
import SponsorshipBookings from './SponsorshipBookings';
import SponsorshipEditor from './SponsorshipEditor';
import MealDayEditor from './MealDayEditor';
import RamadanOptions from './RamadanOptions';
import RamadanSetup from './RamadanSetup';
import { daysInRange, fullDate, seasonDays, seasonLength } from '@/lib/bookingCalendar';
import { collectPages } from '@/lib/formDownloads';
import { printTable } from '@/lib/printTable';
import { money, toPence } from '@/features/operations/model';
import { RAMADAN_KINDS, SPONSORSHIP_STATUS } from './model';
import '@/styles/ramadan.css';

const blankSeason = {
  title: 'Ramadan',
  start_date: '',
  end_date: '',
  day_count: 30,
  iftar_amount: '',
  suhoor_amount: '',
  daily_amount: '',
  published: false,
};
const seasonSetup = (season) => ({
  ...season,
  end_date: seasonDays(season).at(-1)?.date || '',
  iftar_amount: season.iftar_target_pence ? String(season.iftar_target_pence / 100) : '',
  suhoor_amount: season.suhoor_target_pence ? String(season.suhoor_target_pence / 100) : '',
  daily_amount: season.daily_target_pence ? String(season.daily_target_pence / 100) : '',
});
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
const mealLabels = { iftar: 'Iftar', suhoor: 'Suhoor', daily: 'Daily Giving' };

export default function RamadanManager() {
  const auth = useAuth(),
    allowed = auth.can('ramadan');
  const [seasons, setSeasons] = useState([]),
    [seasonId, setSeasonId] = useState(''),
    [seasonsLoading, setSeasonsLoading] = useState(true),
    [records, setRecords] = useState([]),
    [setup, setSetup] = useState(blankSeason),
    [task, setTask] = useState('bookings'),
    [kind, setKind] = useState('iftar'),
    [daySettings, setDaySettings] = useState([]),
    [mealDrafts, setMealDrafts] = useState({}),
    [selected, setSelected] = useState(''),
    [form, setForm] = useState(blankSponsor),
    [editing, setEditing] = useState(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [filter, setFilter] = useState('all'),
    [dayView, setDayView] = useState('month'),
    [range, setRange] = useState({});
  const table = useRef(null),
    loadVersion = useRef(0),
    editorHeading = useRef(null);
  useEffect(() => {
    if (!Object.keys(mealDrafts).length) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [mealDrafts]);
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
        preferred ||
        values.find((value) => value.id === current)?.id ||
        values.find((value) => value.published)?.id ||
        values[0]?.id ||
        '',
    );
    setSeasonsLoading(false);
    if (!values.length) setTask('setup');
  }, []);
  useEffect(() => {
    if (!allowed) return;
    loadSeasons().catch(() => {
      setError('Could not load Ramadan sponsorships.');
      setSeasonsLoading(false);
    });
  }, [allowed, loadSeasons]);
  const season = seasons.find((value) => value.id === seasonId);
  const days = useMemo(() => seasonDays(season), [season]);
  useEffect(() => {
    setSetup(season ? seasonSetup(season) : blankSeason);
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
        .select('*')
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
  useEffect(() => {
    if (!selected || task !== 'bookings') return;
    editorHeading.current?.closest('.sponsorship-editor')?.scrollIntoView({ block: 'nearest' });
    editorHeading.current?.focus({ preventScroll: true });
  }, [selected, editing, task, dayView]);
  async function act(work) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      return true;
    } catch (failure) {
      setError(failure.message || 'The change was not saved.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const current = records.filter((row) => row.kind === kind && row.season_id === seasonId);
  const dayEnabled = (date) =>
    daySettings.find((row) => row.kind === kind && row.day_date === date)?.enabled !== false;
  async function toggleDays(dates, enabled) {
    if (!dates.length || loading) return;
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
  async function saveMeal(payload) {
    return act(async () => {
      const result = await supabase.rpc('save_ramadan_meal', {
        p_body: { ...payload, season_id: seasonId, day_date: selected, kind },
      });
      if (result.error || !result.data?.offer_version)
        throw new Error(result.error?.message || 'Meal was not saved.');
      setDaySettings((current) => [
        ...current.filter((row) => row.kind !== kind || row.day_date !== selected),
        result.data,
      ]);
      if (!editing)
        setForm((current) => ({
          ...current,
          amount: payload.price_pence ? String(payload.price_pence / 100) : '',
        }));
      setMessage('Meal saved.');
    });
  }
  function changeKind(value) {
    setKind(value);
    setEditing(null);
    setFilter('all');
    const record = records.find(
      (row) => row.kind === value && row.day_date === selected && row.status !== 'cancelled',
    );
    if (record) edit(record);
    else
      setForm({
        ...blankSponsor,
        amount: String(
          (daySettings.find((row) => row.kind === value && row.day_date === selected)
            ?.price_pence ??
            season?.[`${value}_target_pence`] ??
            0) / 100 || '',
        ),
      });
  }
  function newSponsor(date) {
    setSelected(date);
    setEditing(null);
    setForm({
      ...blankSponsor,
      amount: daySettings.find((row) => row.kind === kind && row.day_date === date)?.price_pence
        ? String(
            daySettings.find((row) => row.kind === kind && row.day_date === date).price_pence / 100,
          )
        : kind === 'suhoor'
          ? String((season.suhoor_target_pence || 0) / 100 || '')
          : kind === 'iftar'
            ? String((season.iftar_target_pence || 0) / 100 || '')
            : '',
    });
  }
  function edit(row) {
    setKind(row.kind);
    setSelected(row.day_date);
    setEditing(row.id);
    setForm({
      ...blankSponsor,
      ...row,
      amount: row.amount_pence ? String(row.amount_pence / 100) : '',
    });
  }
  function selectDay(date) {
    const existing = current.find(
      (row) =>
        row.day_date === date &&
        (filter === 'all' ? row.status !== 'cancelled' : row.status === filter),
    );
    if (existing) edit(existing);
    else newSponsor(date);
  }
  async function saveSetup(event) {
    event.preventDefault();
    await act(async () => {
      const payload = {
        id: setup.id || null,
        title: setup.title,
        start_date: setup.start_date,
        day_count: seasonLength(setup.start_date, setup.end_date),
        iftar_target_pence: setup.iftar_amount ? toPence(setup.iftar_amount) : 0,
        suhoor_target_pence: setup.suhoor_amount ? toPence(setup.suhoor_amount) : 0,
        daily_target_pence: setup.daily_amount ? toPence(setup.daily_amount) : 0,
        published: setup.published,
      };
      const result = await supabase.rpc('save_ramadan_season', { p_body: payload });
      if (result.error || !result.data)
        throw new Error(result.error?.message || 'Setup was not saved.');
      await loadSeasons(result.data);
      setTask('bookings');
      setMessage('Sponsorship setup saved.');
    });
  }
  async function publishSeason() {
    await act(async () => {
      const payload = {
        id: season.id,
        title: season.title,
        start_date: season.start_date,
        day_count: season.day_count,
        iftar_target_pence: season.iftar_target_pence || 0,
        suhoor_target_pence: season.suhoor_target_pence || 0,
        daily_target_pence: season.daily_target_pence || 0,
        published: !season.published,
      };
      const result = await supabase.rpc('save_ramadan_season', { p_body: payload });
      if (result.error || !result.data)
        throw new Error(result.error?.message || 'Publication was not saved.');
      await loadSeasons(result.data);
      setMessage(payload.published ? 'Ramadan published.' : 'Ramadan unpublished.');
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
  const visibleDays = daysInRange(days, range);
  const rows = visibleDays.flatMap((day) => {
    const entries = current.filter(
      (row) => row.day_date === day.date && (filter === 'all' || row.status === filter),
    );
    return entries.length ? entries.map((row) => ({ ...day, row })) : filter === 'all' ? [day] : [];
  });
  const selectedDay = days.find((day) => day.date === selected);
  const editor = selectedDay && (
    <SponsorshipEditor
      day={selectedDay}
      form={form}
      editing={editing}
      entries={current.filter((row) => row.day_date === selected)}
      enabled={dayEnabled(selected)}
      busy={busy || loading}
      headingRef={editorHeading}
      onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
      onEdit={edit}
      onNew={() => newSponsor(selected)}
      onClose={() => {
        setSelected('');
        setEditing(null);
      }}
      onSave={saveSponsor}
      onToggleDay={() => toggleDays([selected], !dayEnabled(selected))}
    />
  );
  const mealEditor =
    selectedDay && kind !== 'daily' ? (
      <MealDayEditor
        seasonId={seasonId}
        drafts={mealDrafts}
        setDrafts={setMealDrafts}
        onKindChange={changeKind}
        day={selectedDay}
        kind={kind}
        offer={daySettings.find((row) => row.kind === kind && row.day_date === selected)}
        busy={busy || loading}
        onSave={saveMeal}
        onClose={() => setSelected('')}
        bookingEditor={editor}
        bookingCount={
          current.filter((row) => row.day_date === selected && row.status !== 'cancelled').length
        }
        headingRef={editorHeading}
      />
    ) : (
      editor
    );
  if (!allowed) return <p>Ramadan management access is required.</p>;
  return (
    <section
      className={`booking-workspace ramadan-manager ${selected && dayView === 'month' ? 'is-day-open' : ''}`}
      aria-label="Ramadan management"
    >
      <header>
        <div className="sponsorship-section-heading">
          <h2>Ramadan</h2>
          {seasons.length > 0 && (
            <label className="booking-field sponsorship-season-choice">
              <span className="sr-only">Ramadan sponsorships</span>
              <select
                value={seasonId}
                disabled={busy}
                onChange={(event) => setSeasonId(event.target.value)}
              >
                {seasons.map((value) => (
                  <option key={value.id} value={value.id}>
                    {value.title}
                    {value.published ? ' · Live' : ' · Draft'}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {season && (
          <p className="sponsorship-date-summary">
            1–{days.length} Ramadan · {fullDate(season.start_date)} – {fullDate(days.at(-1).date)}
          </p>
        )}
        <nav className="sponsorship-task-nav" aria-label="Ramadan tasks">
          {[
            ['bookings', 'Bookings'],
            ['setup', 'Setup'],
            ['visibility', 'Website & screens'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={task === value}
              disabled={busy}
              onClick={() => setTask(value)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {seasonsLoading && <p role="status">Loading Ramadan…</p>}
      {task === 'setup' && !seasonsLoading && (
        <RamadanSetup
          setup={setup}
          onChange={setSetup}
          onSave={saveSetup}
          busy={busy}
          hasSeason={Boolean(season)}
          onNew={() => setSetup(blankSeason)}
          onCancel={() => {
            setSetup(seasonSetup(season));
            setTask('bookings');
          }}
        />
      )}
      {task === 'visibility' && !seasonsLoading && (
        <>
          {season && (
            <section
              className="booking-panel sponsorship-publication"
              aria-label="Ramadan publication"
            >
              <div className="sponsorship-section-heading">
                <h3>
                  {season.published ? 'Ramadan is published' : 'Draft · hidden from visitors'}
                </h3>
                <button
                  type="button"
                  className="booking-button"
                  disabled={busy}
                  onClick={publishSeason}
                >
                  {season.published ? 'Unpublish Ramadan' : 'Publish Ramadan'}
                </button>
              </div>
              <p>
                {season.published
                  ? 'Choose the booking options and places to show below.'
                  : 'These dates are a draft and are hidden from visitors until you publish this Ramadan.'}
              </p>
            </section>
          )}
          <RamadanOptions
            hasSeason={Boolean(season)}
            publishedTitle={seasons.find((value) => value.published)?.title || ''}
          />
          <div className="booking-actions">
            <Link to="/ramadan">Open Ramadan page</Link>
            {season?.published && (
              <Link to={`/ramadan/display?kind=${kind}`} target="_blank" rel="noopener noreferrer">
                Open sponsorship board
              </Link>
            )}
            {auth.can('tv') && <Link to="/admin?section=tv">Choose a TV screen</Link>}
          </div>
        </>
      )}
      {task === 'bookings' && season && (
        <>
          {!season.published && (
            <p className="sponsorship-date-summary">
              Draft · Publish in Website & screens when ready.
            </p>
          )}
          <div
            className="booking-choices sponsorship-meal-choice"
            role="group"
            aria-label="Ramadan area"
          >
            {Object.entries(mealLabels).map(([key, label]) => (
              <button
                type="button"
                key={key}
                aria-pressed={kind === key}
                disabled={busy}
                onClick={() => {
                  changeKind(key);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="booking-summary sponsorship-booking-summary">
            <span>
              <strong>{current.filter((row) => row.status === 'pending').length}</strong> requested
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
              received
            </span>
          </div>
          <section
            className="booking-panel sponsorship-booking-panel"
            aria-label={`${mealLabels[kind]} bookings`}
          >
            <div className="sponsorship-booking-toolbar">
              <div
                className="booking-choices sponsorship-view-choice"
                role="group"
                aria-label="Sponsorship view"
              >
                {[
                  ['month', 'Month'],
                  ['table', 'Table'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={dayView === value}
                    disabled={busy}
                    onClick={() => setDayView(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="booking-field sponsorship-status-filter">
                <span className="sr-only">Booking status</span>
                <select
                  aria-label="Booking status"
                  value={filter}
                  disabled={busy}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {Object.entries(SPONSORSHIP_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="booking-actions">
                <button
                  type="button"
                  disabled={busy || loading}
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
                <button type="button" onClick={loadRecords} disabled={busy || loading}>
                  Refresh
                </button>
              </div>
            </div>
            <details className="sponsorship-range-options sponsorship-availability-options">
              <summary>Date range & availability</summary>
              <SponsorshipRange
                days={days}
                value={range}
                onChange={setRange}
                disabled={busy || loading}
              />
              <div className="booking-actions">
                <button
                  type="button"
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
                  type="button"
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
              </div>
            </details>
            <SponsorshipKey kind={kind} />
            {loading && <p role="status">Loading sponsorships…</p>}
            <div hidden={dayView !== 'table'}>
              <SponsorshipBookings
                rows={rows}
                tableRef={table}
                selected={selected}
                editing={editing}
                dayEnabled={dayEnabled}
                disabled={busy || loading}
                onEdit={edit}
                onAdd={newSponsor}
                editor={dayView === 'table' ? editor : null}
              />
            </div>
            {dayView === 'month' && (
              <div
                className={`meal-workspace meal-admin-workspace ${selected ? 'has-selected-day' : ''}`}
              >
                <SponsorshipMonth
                  days={days}
                  visibleDates={new Set(rows.map((row) => row.date))}
                  kind={kind}
                  selected={selected}
                  disabled={busy || loading}
                  onSelect={selectDay}
                  help="Tap a day to set its menu, availability or booking."
                  dayInfo={(date) => {
                    const entries = current.filter(
                      (row) => row.day_date === date && row.status !== 'cancelled',
                    );
                    return {
                      enabled: dayEnabled(date),
                      names: entries.map((row) => row.sponsor_name),
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
                {mealEditor || (
                  <div className="meal-day-prompt">
                    <h3>Choose a day</h3>
                    <p>Set Iftar or Suhoor availability, add dishes and set the meal price.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {task === 'bookings' && !season && !seasonsLoading && (
        <p>Add the confirmed Ramadan dates in Setup to start booking.</p>
      )}
    </section>
  );
}
