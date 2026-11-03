import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { londonDate } from '@/lib/timetable';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import { detailsDraft, detailsPayload } from './model';
export default function AdditionalTimesEditor({ onDirty }) {
  const [date, setDate] = useState(londonDate);
  const [draft, setDraft] = useState(() => detailsDraft(null));
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [version, setVersion] = useState(0);
  const lock = useRef(false);
  const dirty = saved !== null && JSON.stringify(saved) !== JSON.stringify(draft);
  useEffect(() => {
    onDirty?.(dirty);
    return () => onDirty?.(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    setMessage('');
    setSaved(null);
    const timer = window.setTimeout(() => controller.abort(), 10000);
    (async () => {
      try {
        const { data, error: failure } = await supabase
          .from('prayer_day_details')
          .select('d_date,sunset,zawwal_start,zawwal_end,source,published,revision')
          .eq('d_date', date)
          .maybeSingle()
          .abortSignal(controller.signal);
        if (failure) throw failure;
        if (!active) return;
        const next = detailsDraft(data);
        setDraft(next);
        setSaved(next);
      } catch {
        if (active) setError('Extra times could not be loaded. Reload before editing.');
      } finally {
        window.clearTimeout(timer);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [date, version]);
  const save = useCallback(async () => {
    if (lock.current || loading || saved === null || !dirty) return false;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = detailsPayload(date, draft);
      const { data, error: failure } = await supabase.rpc('save_prayer_day_details', payload);
      if (failure) throw failure;
      if (data?.d_date !== date || data?.revision !== draft.revision + 1)
        throw new Error('The save could not be confirmed. Reload to compare with your draft.');
      const next = detailsDraft(data);
      setDraft(next);
      setSaved(next);
      setMessage(
        next.published ? 'Extra times published.' : 'Draft saved. Not visible on the website.',
      );
      window.dispatchEvent(new Event('jic-content-updated'));
      return true;
    } catch (e) {
      setError(e.message || 'Save could not be confirmed. Your draft is retained.');
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [date, draft, saved, loading, dirty]);
  useRegisterAdminSave(save, dirty, 'Save extra prayer times', busy || loading);
  const patch = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <section
      className="admin-panel"
      id="prayer-view-additional"
      aria-label="Additional prayer times editor"
    >
      <h3>Sunset &amp; Zawwal</h3>
      <p>
        Use the centre’s approved timetable. These times are not calculated from Dhuhr or Maghrib.
        Sunrise is edited in Daily times.
      </p>
      <label className="admin-field">
        Date
        <input
          type="date"
          value={date}
          disabled={busy}
          onChange={(e) => {
            if (!e.target.value) return;
            if (dirty && !window.confirm('Discard unsaved extra times for this date?')) return;
            setDate(e.target.value);
          }}
        />
      </label>
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
      {loading && <p role="status">Loading extra times…</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save().catch(() => {});
        }}
      >
        <fieldset disabled={busy || loading || saved === null}>
          <div className="admin-form-grid">
            {[
              ['sunset', 'Sunset'],
              ['zawwal_start', 'Zawwal starts'],
              ['zawwal_end', 'Zawwal ends'],
            ].map(([key, label]) => (
              <label key={key} className="admin-field">
                {label}
                <input
                  type="time"
                  value={draft[key]}
                  onChange={(e) => patch(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="admin-field">
            Source / approval reference
            <input
              value={draft.source}
              maxLength={250}
              onChange={(e) => patch('source', e.target.value)}
              placeholder="For example: approved November timetable"
            />
          </label>
          <label className="admin-field">
            <span>
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => patch('published', e.target.checked)}
              />{' '}
              Show these confirmed times on the website
            </span>
          </label>
          <p>
            Leave unconfirmed times blank. Switching publication off keeps the saved record and
            audit history.
          </p>
          <button className="admin-button primary" disabled={!dirty} type="submit">
            {busy ? 'Saving…' : 'Save extra times'}
          </button>
        </fieldset>
      </form>
      <button
        className="admin-button"
        type="button"
        disabled={busy || loading}
        onClick={() => {
          if (!dirty || window.confirm('Discard this draft and reload the saved times?'))
            setVersion((v) => v + 1);
        }}
      >
        Reload saved times
      </button>
    </section>
  );
}
