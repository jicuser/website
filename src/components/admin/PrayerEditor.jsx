import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Upload, Download, Save, Clock3, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import {
  prayerFields,
  jummahFields,
  defaultJummah,
  londonDate,
  parseTimetable,
  displayTime,
} from '@/lib/timetable';

const CSV_TEMPLATE =
  'd_date,fajr_begins,fajr_jamah,sunrise,zuhr_begins,zuhr_jamah,asr_begins,asr_jamah,maghrib_begins,maghrib_jamah,isha_begins,isha_jamah,is_ramadan\r\n';
const comparable = (value) => JSON.stringify(value || {});

export default function PrayerEditor() {
  const [date, setDate] = useState(londonDate);
  const [form, setForm] = useState({});
  const [savedForm, setSavedForm] = useState({});
  const [jummah, setJummah] = useState(defaultJummah);
  const [savedJummah, setSavedJummah] = useState(defaultJummah);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [dates, setDates] = useState([]);

  const dirtyDay = comparable(form) !== comparable(savedForm);
  const dirtyJummah = comparable(jummah) !== comparable(savedJummah);
  const dirty = dirtyDay || dirtyJummah || Boolean(pending);

  const load = useCallback(async (targetDate) => {
    setLoading(true);
    setError('');
    try {
      const [dayResult, jummahResult, listResult] = await Promise.all([
        supabase.from('prayer_times').select('*').eq('d_date', targetDate).maybeSingle(),
        supabase
          .from('page_content')
          .select('content_value')
          .eq('content_key', 'jummah_settings')
          .maybeSingle(),
        supabase.from('prayer_times').select('d_date').order('d_date').limit(1000),
      ]);
      const failure = dayResult.error || jummahResult.error || listResult.error;
      if (failure) throw failure;
      const day = dayResult.data || {};
      const weekly = jummahResult.data
        ? { ...defaultJummah, ...JSON.parse(jummahResult.data.content_value) }
        : defaultJummah;
      setForm(day);
      setSavedForm(day);
      setJummah(weekly);
      setSavedJummah(weekly);
      setDates(listResult.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const notifyUpdated = () => window.dispatchEvent(new Event('jic-content-updated'));

  const saveDay = useCallback(async () => {
    if (!dirtyDay) return;
    const payload = { d_date: date, is_ramadan: Boolean(form.is_ramadan) };
    for (const [key] of [...prayerFields, ...jummahFields]) payload[key] = form[key] || null;
    const { data, error: saveError } = await supabase
      .from('prayer_times')
      .upsert(payload, { onConflict: 'd_date' })
      .select('d_date');
    if (saveError) throw saveError;
    if (data?.length !== 1) throw new Error('The prayer date was not saved.');
    setSavedForm({ ...form });
  }, [date, form, dirtyDay]);

  const saveJummah = useCallback(async () => {
    if (!dirtyJummah) return;
    if (jummahFields.some(([key]) => !jummah[key]))
      throw new Error('Complete all weekly Jummah times first.');
    const { error: saveError } = await supabase.from('page_content').upsert(
      {
        content_key: 'jummah_settings',
        content_value: JSON.stringify(jummah),
        content_type: 'json',
        page: 'prayer-times',
      },
      { onConflict: 'content_key' },
    );
    if (saveError) throw saveError;
    setSavedJummah({ ...jummah });
  }, [jummah, dirtyJummah]);

  const publishCsv = useCallback(async () => {
    if (!pending) return;
    const rows = pending.rows;
    const { data, error: saveError } = await supabase
      .from('prayer_times')
      .upsert(rows, { onConflict: 'd_date', defaultToNull: false })
      .select('d_date');
    if (saveError) throw saveError;
    if (data?.length !== rows.length) throw new Error('Could not verify every imported date.');
    setPending(null);
    setDates((current) => {
      const merged = new Set([
        ...current.map((item) => item.d_date),
        ...rows.map((item) => item.d_date),
      ]);
      return [...merged].sort().map((d_date) => ({ d_date }));
    });
  }, [pending]);

  const saveAll = useCallback(async () => {
    if (!dirty || busy || loading) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (pending) await publishCsv();
      if (dirtyJummah) await saveJummah();
      if (dirtyDay) await saveDay();
      notifyUpdated();
      setMessage('Saved to database.');
    } catch (saveError) {
      setError(saveError.message);
      throw saveError;
    } finally {
      setBusy(false);
    }
  }, [dirty, busy, loading, pending, publishCsv, dirtyJummah, saveJummah, dirtyDay, saveDay]);

  const saveOne = async (task) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await task();
      notifyUpdated();
      setMessage('Saved to database.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  useRegisterAdminSave(saveAll, dirty && !busy && !loading, 'Save timetable changes');

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setMessage('');
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('CSV must be under 2 MB.');
      setPending({ name: file.name, rows: parseTimetable(await file.text()) });
    } catch (importError) {
      setError(importError.message);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF', CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'jic-timetable-template.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const changeDate = (event) => {
    const nextDate = event.target.value;
    if (dirtyDay && !window.confirm('Discard unsaved changes for this date?')) return;
    setDate(nextDate);
  };

  const storedRange = useMemo(
    () =>
      dates.length
        ? `${dates.length} dates · ${dates[0].d_date} to ${dates.at(-1).d_date}`
        : 'No timetable loaded',
    [dates],
  );

  return (
    <div className="admin-workspace">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">PRAYER TIMES</span>
          <h2>Prayer timetable</h2>
        </div>
        <a href="/prayer-times" target="_blank" rel="noreferrer" className="admin-button">
          View timetable ↗
        </a>
      </div>
      {error && (
        <div role="alert" className="admin-error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="admin-success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-section-title">
          <Upload />
          <div>
            <h3>CSV timetable</h3>
            <p>{storedRange}</p>
          </div>
        </div>
        <div className="admin-upload">
          <div className="admin-actions">
            <label className="admin-button primary">
              <Upload size={17} />
              Choose CSV
              <input
                disabled={busy || loading}
                type="file"
                accept=".csv,text/csv"
                onChange={importCsv}
                hidden
              />
            </label>
            <button type="button" onClick={downloadTemplate} className="admin-button">
              <Download size={17} />
              CSV template
            </button>
          </div>
        </div>
        {pending && (
          <div className="admin-import-preview">
            <h3>
              {pending.name} · {pending.rows.length} dates
            </h3>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fajr</th>
                    <th>Dhuhr</th>
                    <th>Asr</th>
                    <th>Maghrib</th>
                    <th>Isha</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.rows.slice(0, 5).map((row) => (
                    <tr key={row.d_date}>
                      <td>{row.d_date}</td>
                      {['fajr', 'zuhr', 'asr', 'maghrib', 'isha'].map((key) => (
                        <td key={key}>{displayTime(row[`${key}_jamah`])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-actions">
              <button
                disabled={busy}
                onClick={() => saveOne(publishCsv)}
                className="admin-button primary"
              >
                Save CSV
              </button>
              <button disabled={busy} className="admin-button" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-title">
          <Clock3 />
          <div>
            <h3>Weekly Jummah</h3>
          </div>
        </div>
        <div className="admin-field-grid">
          {jummahFields.map(([key, title]) => (
            <label key={key}>
              {title}
              <input
                disabled={loading || busy}
                type="time"
                value={jummah[key] || ''}
                onChange={(event) => setJummah({ ...jummah, [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <p className="admin-time-preview">
          1st Jama’ah {displayTime(jummah.jummah_1_jamah)} · 2nd Jama’ah{' '}
          {displayTime(jummah.jummah_2_jamah)}
        </p>
        <button
          disabled={busy || loading || !dirtyJummah}
          onClick={() => saveOne(saveJummah)}
          className="admin-button primary"
        >
          <Save size={16} />
          Save Jummah
        </button>
      </section>

      <section className="admin-panel">
        <h3>Single date</h3>
        <label className="admin-date">
          Date
          <input disabled={busy} type="date" value={date} onChange={changeDate} />
        </label>
        <div className="admin-field-grid">
          {prayerFields.map(([key, title]) => (
            <label key={key}>
              {title}
              <input
                disabled={loading || busy}
                type="time"
                value={form[key]?.slice(0, 5) || ''}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={Boolean(form.is_ramadan)}
            onChange={(event) => setForm({ ...form, is_ramadan: event.target.checked })}
          />{' '}
          Ramadan day
        </label>
        <details>
          <summary>Jummah overrides</summary>
          <div className="admin-field-grid">
            {jummahFields.map(([key, title]) => (
              <label key={key}>
                {title}
                <input
                  disabled={loading || busy}
                  type="time"
                  value={form[key]?.slice(0, 5) || ''}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                />
              </label>
            ))}
          </div>
        </details>
        <button
          disabled={busy || loading || !dirtyDay}
          onClick={() => saveOne(saveDay)}
          className="admin-button primary"
        >
          <Save size={16} />
          Save date
        </button>
      </section>
    </div>
  );
}
