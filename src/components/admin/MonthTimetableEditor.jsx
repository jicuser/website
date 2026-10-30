import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate, prayerFields, jummahFields, displayTime } from '@/lib/timetable';
import { monthDates, monthDraft, applyJamaahRange, validateMonth } from '@/lib/timetableEditor';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import WallpaperDownload from '@/components/WallpaperDownload';
import '@/styles/timetable-editor.css';

export default function MonthTimetableEditor({ onDirty, onSaved, weeklyJummah }) {
  const [month, setMonth] = useState(londonDate().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [baseline, setBaseline] = useState('[]');
  const [day, setDay] = useState(0);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [range, setRange] = useState({ key: 'fajr_jamah', time: '', start: '', end: '' });
  const dirty = JSON.stringify(rows) !== baseline;
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setError('');
    setRows([]);
    setBaseline('[]');
    setDay(0);
    setStep(1);
    const dates = monthDates(month);
    supabase
      .from('prayer_times')
      .select('*')
      .gte('d_date', dates[0])
      .lte('d_date', dates.at(-1))
      .order('d_date')
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setError('Could not load the month. Reopen the editor to retry.');
          return;
        }
        const draft = monthDraft(month, data);
        setRows(draft);
        setBaseline(JSON.stringify(draft));
        setLoaded(true);
        setRange((r) => ({ ...r, start: dates[0], end: dates.at(-1) }));
      })
      .catch(() => {
        if (active) setError('Could not load the month. Reopen the editor to retry.');
      });
    return () => {
      active = false;
    };
  }, [month]);
  const save = useCallback(async () => {
    if (!loaded || busy || !dirty) return false;
    setError('');
    setMessage('');
    try {
      const valid = validateMonth(rows);
      const old = JSON.parse(baseline);
      const changed = valid.filter((_, i) => JSON.stringify(rows[i]) !== JSON.stringify(old[i]));
      setBusy(true);
      const { data, error } = await supabase
        .from('prayer_times')
        .upsert(changed, { onConflict: 'd_date', defaultToNull: false })
        .select('d_date');
      if (error) throw error;
      if (data?.length !== changed.length)
        throw new Error('Could not verify every saved date. Please reload and check.');
      setBaseline(JSON.stringify(rows));
      setMessage('Month saved. Website prayer times updated.');
      window.dispatchEvent(new Event('jic-content-updated'));
      onSaved();
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [rows, baseline, loaded, busy, dirty, onSaved]);
  useRegisterAdminSave(save, loaded && dirty, 'Save month', busy);
  const row = rows[day];
  const edit = (key, value) => {
    setRows((current) => current.map((r, i) => (i === day ? { ...r, [key]: value } : r)));
    setMessage('');
  };
  const title = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const complete = rows.filter((r) => prayerFields.every(([key]) => r[key])).length;
  return (
    <section
      id="prayer-view-month"
      className="admin-panel jic-month-editor"
      aria-label="Monthly timetable editor"
    >
      <nav className="admin-actions" aria-label="Month editor steps">
        {['Choose month', 'Edit times', 'Preview & download'].map((label, i) => (
          <button
            key={label}
            type="button"
            className="admin-button"
            aria-pressed={step === i + 1}
            disabled={busy || (i > 0 && !loaded)}
            onClick={() => setStep(i + 1)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>
      {dirty && (
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Discard all unsaved changes to this month?')) {
              setRows(JSON.parse(baseline));
              setMessage('Draft discarded.');
            }
          }}
        >
          Discard draft changes
        </button>
      )}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="admin-success">
          {message}
        </p>
      )}
      {step === 1 && (
        <div>
          <h3>Choose your month</h3>
          <label>
            Month
            <input
              type="month"
              value={month}
              disabled={busy}
              onChange={(e) => {
                if (
                  e.target.value &&
                  (!dirty || window.confirm('Discard unsaved month changes?'))
                ) {
                  setMessage('');
                  setMonth(e.target.value);
                }
              }}
            />
          </label>
          <p>
            {loaded
              ? `${complete} of ${rows.length} days complete. Existing times are loaded for you.`
              : 'Loading month…'}
          </p>
          <button className="admin-button primary" disabled={!loaded} onClick={() => setStep(2)}>
            Edit times →
          </button>
        </div>
      )}
      {step === 2 && row && (
        <div>
          <h3>
            {title} · {complete}/{rows.length} days complete
          </h3>
          <div className="jic-month-days" aria-label="Choose day">
            {rows.map((r, i) => (
              <button
                key={r.d_date}
                type="button"
                disabled={busy}
                aria-pressed={day === i}
                onClick={() => setDay(i)}
                aria-label={`${r.d_date}${prayerFields.every(([key]) => r[key]) ? ', complete' : ', missing times'}`}
              >
                {i + 1}
                <span aria-hidden="true">{prayerFields.every(([key]) => r[key]) ? '✓' : '·'}</span>
              </button>
            ))}
          </div>
          <h4>
            {new Date(row.d_date + 'T12:00:00Z').toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'UTC',
            })}
          </h4>
          <p>Enter the centre’s confirmed times. Use 24-hour time: 1:00pm is 13:00.</p>
          <div className="jic-month-prayers">
            <div className="jic-month-prayer-labels">
              <span>Prayer</span>
              <span>Start</span>
              <span>Jama’ah</span>
            </div>
            {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].map((prayer) => (
              <div className="jic-month-prayer-pair" key={prayer}>
                <strong>
                  {prayer === 'zuhr' ? 'Dhuhr' : prayer[0].toUpperCase() + prayer.slice(1)}
                </strong>
                {prayerFields
                  .filter(([key]) => key.startsWith(prayer + '_'))
                  .map(([key, label]) => (
                    <input
                      key={key}
                      aria-label={label}
                      type="time"
                      disabled={busy}
                      value={row[key]}
                      onInput={(e) => edit(key, e.target.value)}
                    />
                  ))}
              </div>
            ))}
          </div>
          <label>
            Sunrise
            <input
              type="time"
              disabled={busy}
              value={row.sunrise}
              onInput={(e) => edit('sunrise', e.target.value)}
            />
          </label>
          <details>
            <summary>Jummah times for this date</summary>
            <p>Leave blank to use the weekly Jummah settings.</p>
            <div className="admin-field-grid">
              {jummahFields.map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="time"
                    disabled={busy}
                    value={row[key]}
                    onInput={(e) => edit(key, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </details>
          <label className="admin-check">
            <input
              type="checkbox"
              disabled={busy}
              checked={row.is_ramadan}
              onChange={(e) => edit('is_ramadan', e.target.checked)}
            />{' '}
            Ramadan day
          </label>
          <details>
            <summary>Use one Jama’ah time for several days</summary>
            <div className="admin-field-grid">
              <label>
                Prayer
                <select
                  disabled={busy}
                  value={range.key}
                  onChange={(e) => setRange({ ...range, key: e.target.value })}
                >
                  {prayerFields
                    .filter(([key]) => key.endsWith('_jamah'))
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Time
                <input
                  disabled={busy}
                  type="time"
                  value={range.time}
                  onInput={(e) => setRange({ ...range, time: e.target.value })}
                />
              </label>
              {['start', 'end'].map((key) => (
                <label key={key}>
                  {key === 'start' ? 'From' : 'Through'}
                  <input
                    type="date"
                    disabled={busy}
                    min={rows[0].d_date}
                    max={rows.at(-1).d_date}
                    value={range[key]}
                    onChange={(e) => setRange({ ...range, [key]: e.target.value })}
                  />
                </label>
              ))}
            </div>
            <button
              className="admin-button"
              disabled={busy}
              onClick={() => {
                try {
                  setRows(applyJamaahRange(rows, range.key, range.time, range.start, range.end));
                  setError('');
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Apply to selected days
            </button>
          </details>
          <div className="admin-actions">
            <button
              className="admin-button"
              disabled={day === 0 || busy}
              onClick={() => setDay(day - 1)}
            >
              ← Previous day
            </button>
            <button
              className="admin-button"
              disabled={day === rows.length - 1 || busy}
              onClick={() => setDay(day + 1)}
            >
              Next day →
            </button>
            <button className="admin-button primary" onClick={() => setStep(3)}>
              Preview & download →
            </button>
          </div>
        </div>
      )}
      {step === 3 && loaded && (
        <div>
          <h3>Check your month</h3>
          <p>
            {dirty ? 'Draft — downloads include your unsaved edits.' : 'Saved timetable.'}{' '}
            {complete} of {rows.length} days complete.
          </p>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {prayerFields.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.d_date}>
                    <th>{r.d_date}</th>
                    {prayerFields.map(([key]) => (
                      <td key={key}>{displayTime(r[key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {complete === rows.length ? (
            <WallpaperDownload
              editable
              monthlyPrayerTimes={rows}
              currentMonth={title}
              jummahTimes={[
                { name: 'First Jummah', prayer: weeklyJummah.jummah_1_jamah },
                { name: 'Second Jummah', prayer: weeklyJummah.jummah_2_jamah },
              ]}
            />
          ) : (
            <p>Complete all daily times to enable the print and wallpaper downloads.</p>
          )}
          <button
            className="admin-button primary"
            disabled={busy || !dirty || complete !== rows.length}
            onClick={() => save().catch(() => {})}
          >
            {busy ? 'Saving…' : 'Save month to website'}
          </button>
        </div>
      )}
    </section>
  );
}
