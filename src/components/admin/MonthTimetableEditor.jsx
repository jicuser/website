import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate, prayerFields, jummahFields, displayTime } from '@/lib/timetable';
import { monthDates, monthDraft, applyJamaahRange, validateMonth } from '@/lib/timetableEditor';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { detailsDraft } from '@/features/prayer-details/model';
import { monthlyDetailWrites, saveMonthlyDetails } from '@/lib/saveTimetableMonth';
import ClockTimeInput from './ClockTimeInput';
import WallpaperDownload from '@/components/WallpaperDownload';
import { parseTimetablePaste } from '@/lib/timetablePaste';
import '@/styles/timetable-editor.css';

const extraFields = [
  ['zawwal_start', 'Zawal'],
  ['zawwal_end', 'Zawal end'],
  ['sunset', 'Sunset'],
];

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
  const [paste, setPaste] = useState('');
  const [detailDraft, setDetailDraft] = useState({});
  const [detailBaseline, setDetailBaseline] = useState({});
  const [detailSource, setDetailSource] = useState('');
  const [publishDetails, setPublishDetails] = useState(true);
  const [reload, setReload] = useState(0);
  const saveLock = useRef(false);
  const [reference, setReference] = useState(null);
  const [allDays, setAllDays] = useState(true);
  const [range, setRange] = useState({ key: 'fajr_jamah', time: '', start: '', end: '' });
  const status = loaded ? 'ready' : 'loading';
  const dirty = JSON.stringify(rows) !== baseline;
  const detailDirty = Object.keys(detailDraft).length > 0;
  useEffect(
    () => () => {
      if (reference) URL.revokeObjectURL(reference.url);
    },
    [reference],
  );
  useEffect(() => {
    onDirty(dirty || detailDirty);
    return () => onDirty(false);
  }, [dirty, detailDirty, onDirty]);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    setError('');
    setRows([]);
    setBaseline('[]');
    setDay(0);
    setStep(1);
    setDetailDraft({});
    setDetailBaseline({});
    setDetailSource('');
    setPaste('');
    const dates = monthDates(month);
    Promise.all([
      supabase
        .from('prayer_times')
        .select('*')
        .gte('d_date', dates[0])
        .lte('d_date', dates.at(-1))
        .order('d_date'),
      supabase
        .from('prayer_day_details')
        .select('d_date,sunset,zawwal_start,zawwal_end,source,published,revision')
        .gte('d_date', dates[0])
        .lte('d_date', dates.at(-1)),
    ])
      .then(([prayers, details]) => {
        if (!active) return;
        if (prayers.error || details.error) {
          setError('Could not load all monthly times. Reload before editing.');
          return;
        }
        const draft = monthDraft(month, prayers.data);
        setDetailBaseline(
          Object.fromEntries((details.data || []).map((item) => [item.d_date, detailsDraft(item)])),
        );
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
  }, [month, reload]);
  const save = useCallback(async () => {
    if (!loaded || saveLock.current || (!dirty && !detailDirty)) return false;
    saveLock.current = true;
    setError('');
    setMessage('');
    setBusy(true);
    let savedAny = false;
    try {
      const old = JSON.parse(baseline);
      const changed = validateMonth(
        rows.filter((r, i) => JSON.stringify(r) !== JSON.stringify(old[i])),
      );
      const writes = monthlyDetailWrites(detailBaseline, detailDraft, detailSource, publishDetails);
      if (changed.length) {
        const { data, error } = await supabase
          .from('prayer_times')
          .upsert(changed, { onConflict: 'd_date', defaultToNull: false })
          .select('d_date');
        if (error) throw error;
        if (data?.length !== changed.length)
          throw new Error('Could not verify every saved date. Please reload and check.');
        setBaseline(JSON.stringify(rows));
        savedAny = true;
      }
      await saveMonthlyDetails(supabase, writes, (date, detail) => {
        savedAny = true;
        setDetailBaseline((current) => ({ ...current, [date]: detail }));
        setDetailDraft((current) => {
          const remaining = { ...current };
          delete remaining[date];
          return remaining;
        });
      });
      setMessage(
        publishDetails || !writes.length
          ? 'Month saved. Published times updated across the website.'
          : 'Prayer times saved. Additional times saved as drafts.',
      );
      onSaved();
      return true;
    } catch (e) {
      setError(
        `${savedAny ? 'Some changes saved. Unsaved edits are still here. ' : ''}${e.message}`,
      );
      throw e;
    } finally {
      if (savedAny) window.dispatchEvent(new Event('jic-content-updated'));
      saveLock.current = false;
      setBusy(false);
    }
  }, [
    rows,
    baseline,
    loaded,
    dirty,
    detailDirty,
    detailBaseline,
    detailDraft,
    detailSource,
    publishDetails,
    onSaved,
  ]);
  useRegisterAdminSave(save, dirty || detailDirty, 'Save month', busy || !loaded);
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
  const applyPaste = (text) => {
    try {
      const imported = parseTimetablePaste(text, month);
      setRows((current) =>
        current.map((row) => {
          const next = imported.rows.find((item) => item.d_date === row.d_date);
          return next ? { ...row, ...next } : row;
        }),
      );
      setDetailDraft((current) => ({ ...current, ...imported.details }));
      setError('');
      setMessage(
        `${imported.rows.length} days added to your draft. Check the table before downloading or saving.`,
      );
      setStep(2);
      setAllDays(true);
    } catch (failure) {
      setError(failure.message);
    }
  };
  const downloadRows = rows.map((row) => ({
    ...row,
    ...detailBaseline[row.d_date],
    ...detailDraft[row.d_date],
  }));
  const editDetail = (date, key, value) =>
    setDetailDraft((current) => ({
      ...current,
      [date]: { ...current[date], [key]: value },
    }));
  const retry = () => {
    if (
      (!dirty && !detailDirty) ||
      window.confirm('Discard this draft and reload all saved monthly times?')
    )
      setReload((value) => value + 1);
  };
  return (
    <section
      id="prayer-view-month"
      className="admin-panel jic-month-editor"
      aria-label="Monthly timetable editor"
    >
      <nav className="admin-actions" aria-label="Month editor steps">
        {['Month & import', 'Check times', 'Design & download'].map((label, i) => (
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
      {(dirty || detailDirty) && (
        <button
          type="button"
          className="admin-button"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Discard all unsaved changes to this month?')) {
              setRows(JSON.parse(baseline));
              setDetailDraft({});
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
      {detailDirty && (
        <section className="admin-panel" aria-label="Publish additional monthly times">
          <h4>Additional times · {Object.keys(detailDraft).length} edited dates</h4>
          <label>
            Source for edited additional times
            <input
              value={detailSource}
              disabled={busy}
              maxLength={250}
              placeholder="Use the existing source, or enter the approved timetable"
              onChange={(event) => setDetailSource(event.target.value)}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={publishDetails}
              disabled={busy}
              onChange={(event) => setPublishDetails(event.target.checked)}
            />
            Publish these additional times when saving the month
          </label>
          <p>
            Sunset and Zawal edits save with the month. New records need a source; existing sources
            are kept unless replaced.
          </p>
        </section>
      )}
      {step === 1 && (
        <div>
          <h3>Choose your month</h3>
          <button type="button" className="admin-button" disabled={busy} onClick={retry}>
            Reload saved month
          </button>
          <label>
            Month
            <input
              type="month"
              value={month}
              disabled={busy}
              onChange={(e) => {
                if (
                  e.target.value &&
                  ((!dirty && !detailDirty) || window.confirm('Discard unsaved month changes?'))
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
          <div className="timetable-import">
            <h4>Paste or upload your times</h4>
            <p>
              Copy a table from Excel or Google Sheets, or upload CSV/TSV. Use AM/PM times or
              24-hour times. Nothing is published until you save.
            </p>
            <label>
              Paste times
              <textarea
                rows={7}
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
                placeholder="Paste spreadsheet cells here"
              />
            </label>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-button primary"
                disabled={!loaded || !paste.trim() || busy}
                onClick={() => applyPaste(paste)}
              >
                Add pasted times
              </button>
              <label className="admin-button">
                Upload CSV / TSV
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  disabled={!loaded || busy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setError('Choose a table under 2 MB.');
                      return;
                    }
                    try {
                      const text = await file.text();
                      setPaste(text);
                      applyPaste(text);
                    } catch (failure) {
                      setError(failure.message);
                    }
                  }}
                />
              </label>
            </div>
            <details>
              <summary>Column order for copying the original sheet</summary>
              <p>
                Day number, Fajr start, Fajr Jamaat, Sunrise, Zawal, Dhuhr start, Dhuhr Jamaat, Asr
                start, Asr Jamaat, Maghrib, Isha start, Isha Jamaat. Separate columns with tabs. A
                ditto mark repeats the previous value. Maghrib Jamaat uses its Adhan time.
              </p>
              <p>
                CSV files can also use the existing timetable template headings, with an optional
                zawwal_start column.
              </p>
            </details>
            <label>
              Original sheet for reference
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (
                    file.size > 10 * 1024 * 1024 ||
                    (!file.type.startsWith('image/') && file.type !== 'application/pdf')
                  ) {
                    setError('Choose an image or PDF under 10 MB.');
                    return;
                  }
                  setReference({
                    url: URL.createObjectURL(file),
                    image: file.type.startsWith('image/'),
                    name: file.name,
                  });
                }}
              />
            </label>
            <p>
              Images and PDFs are references, not automatically recognised times. Check and copy
              their values into the table.
            </p>
          </div>
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
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              aria-pressed={allDays}
              onClick={() => setAllDays(true)}
            >
              All days
            </button>
            <button
              type="button"
              className="admin-button"
              aria-pressed={!allDays}
              onClick={() => setAllDays(false)}
            >
              One day at a time
            </button>
          </div>
          {reference && (
            <details>
              <summary>View original: {reference.name}</summary>
              {reference.image ? (
                <img
                  className="timetable-reference"
                  src={reference.url}
                  alt="Uploaded original timetable reference"
                />
              ) : (
                <a href={reference.url} target="_blank" rel="noopener noreferrer">
                  Open original PDF
                </a>
              )}
            </details>
          )}
          {allDays ? (
            <div className="admin-table-scroll timetable-edit-grid">
              <table>
                <caption>Editable monthly timetable · 12-hour clock, AM/PM</caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    {[...prayerFields, ...extraFields].map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item.d_date}
                      className={
                        new Date(`${item.d_date}T12:00:00Z`).getUTCDay() === 5 ? 'is-friday' : ''
                      }
                    >
                      <th scope="row">{item.d_date}</th>
                      {[...prayerFields, ...extraFields].map(([key, label]) => (
                        <td key={key}>
                          <ClockTimeInput
                            aria-label={`${item.d_date} ${label}`}
                            value={
                              extraFields.some(([field]) => field === key)
                                ? (detailDraft[item.d_date]?.[key] ??
                                  detailBaseline[item.d_date]?.[key] ??
                                  '')
                                : item[key]
                            }
                            disabled={busy}
                            onChange={(value) => {
                              if (extraFields.some(([field]) => field === key))
                                editDetail(item.d_date, key, value);
                              else
                                setRows((current) =>
                                  current.map((r) =>
                                    r.d_date === item.d_date ? { ...r, [key]: value } : r,
                                  ),
                                );
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
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
                    <span aria-hidden="true">
                      {prayerFields.every(([key]) => r[key]) ? '✓' : '·'}
                    </span>
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
              <p>Enter the centre’s confirmed times and choose AM or PM.</p>
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
                        <ClockTimeInput
                          key={key}
                          aria-label={label}

                          disabled={busy}
                          value={row[key]}
                          onChange={(value) => edit(key, value)}
                        />
                      ))}
                  </div>
                ))}
              </div>
              <div className="admin-time-field">
                <span>Sunrise</span>
                <ClockTimeInput
                  aria-label="Sunrise"
                  disabled={busy}
                  value={row.sunrise}
                  onChange={(value) => edit('sunrise', value)}
                />
              </div>
              <div className="admin-field-grid">
                {extraFields.map(([key, label]) => (
                  <div className="admin-time-field" key={key}>
                    <span>
                      {label}
                      {key === 'zawwal_end' ? ' (optional)' : ''}
                    </span>
                    <ClockTimeInput
                      aria-label={label}
                      disabled={busy}
                      value={
                        detailDraft[row.d_date]?.[key] ?? detailBaseline[row.d_date]?.[key] ?? ''
                      }
                      onChange={(value) => editDetail(row.d_date, key, value)}
                    />
                  </div>
                ))}
              </div>
              <p>Ishraq is calculated from Sunrise + 20 minutes.</p>
              <details>
                <summary>Jummah times for this date</summary>
                <p>Leave blank to use the weekly Jummah settings.</p>
                <div className="admin-field-grid">
                  {jummahFields.map(([key, label]) => (
                    <div className="admin-time-field" key={key}>
                      <span>{label}</span>
                      <ClockTimeInput
                        aria-label={label}
                        disabled={busy}
                        value={row[key]}
                        onChange={(value) => edit(key, value)}
                      />
                    </div>
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
                  <div className="admin-time-field">
                    <span>Time</span>
                    <ClockTimeInput
                      aria-label="Time for selected days"
                      disabled={busy}

                      value={range.time}
                      onChange={(value) => setRange({ ...range, time: value })}
                    />
                  </div>
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
                      setRows(
                        applyJamaahRange(rows, range.key, range.time, range.start, range.end),
                      );
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
            </>
          )}
          {allDays && (
            <button type="button" className="admin-button primary" onClick={() => setStep(3)}>
              Design & download →
            </button>
          )}
        </div>
      )}
      {step === 3 && loaded && (
        <div>
          <h3>Check your month</h3>
          <p>
            {dirty || detailDirty
              ? 'Draft — downloads include your unsaved edits.'
              : 'Saved timetable.'}{' '}
            {complete} of {rows.length} days complete.
          </p>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  {[...prayerFields, ...extraFields].map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {downloadRows.map((r) => (
                  <tr key={r.d_date}>
                    <th>{r.d_date}</th>
                    {[...prayerFields, ...extraFields].map(([key]) => (
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
              monthlyPrayerTimes={downloadRows}
              detailsStatus={status}
              retryDetails={retry}
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
            disabled={busy || (!dirty && !detailDirty)}
            onClick={() => save().catch(() => {})}
          >
            {busy ? 'Saving…' : 'Save month to website'}
          </button>
        </div>
      )}
    </section>
  );
}
