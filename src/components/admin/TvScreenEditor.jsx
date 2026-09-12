import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl } from '@/lib/video';
import { londonDate } from '@/lib/timetable';
import { tvScene, normaliseTvSettings } from '../../../supabase/functions/_shared/tv.js';
import TvPreview from './TvPreview';
import SceneEditor from '@/features/displays/SceneEditor';
import NormalSettings from '@/features/displays/NormalSettings';
import DeviceInputs from '@/features/displays/DeviceInputs';
import TvConnections from '@/features/displays/TvConnections';
import SessionOutput from '@/features/displays/SessionOutput';

export default function TvScreenEditor({ screenId }) {
  const hall = screenId !== 'shoe-area';
  const screen = TV_SCREENS.find((item) => item.id === screenId);
  const [data, setData] = useState(null),
    [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null),
    [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false),
    [showPreview, setShowPreview] = useState(false);
  const [minutes, setMinutes] = useState('0');
  const editing = useRef(false),
    saving = useRef(false);
  const { events } = useHomeLiveContent({ eventLimit: 50 });
  const currentEvents = events.filter(
    (event) => event.event_date >= londonDate() && safeWebUrl(event.poster_url),
  );
  const dirty = Boolean(form && JSON.stringify(form) !== JSON.stringify(baseline?.settings));
  editing.current = dirty || busy;
  const accept = useCallback((next) => {
    next.settings = normaliseTvSettings(next.settings);
    setData(next);
    setForm(next.settings);
    setBaseline(next);
  }, []);
  const load = useCallback(async () => {
    try {
      accept(await tvRequest('admin', screenId, {}, { staff: true }));
      setMessage('');
    } catch (e) {
      setMessage(e.message);
    }
  }, [screenId, accept]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let active = true,
      timer;
    async function poll() {
      try {
        const next = await tvRequest('admin', screenId, {}, { staff: true });
        if (active) {
          setData(next);
          if (!editing.current && !saving.current) accept(next);
        }
      } catch {
        /* Keep unsaved edits on a temporary connection failure. */
      }
      if (active) timer = setTimeout(poll, 5000);
    }
    timer = setTimeout(poll, 5000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [screenId, accept]);
  const save = useCallback(async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setMessage('');
    try {
      const next = await tvRequest(
        'save',
        screenId,
        { settings: form, expectedUpdatedAt: baseline.updated_at },
        { staff: true },
      );
      accept({ ...data, ...next });
      setMessage('Saved. The TV browser will update within a few seconds.');
    } catch (e) {
      setMessage(e.message);
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }, [screenId, form, baseline, data, accept]);
  useRegisterAdminSave(save, dirty, `Save ${screen.label}`);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  async function run(fn) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Link copied.');
    } catch {
      setMessage('Select and copy the link.');
    }
  }
  const screenUrl = `${window.location.origin}/tv179/${screenId}`;
  const sourceSettings = baseline?.settings || form;
  return (
    <div className="admin-tv-editor">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">TV SCREENS</span>
          <h2>{screen.label}</h2>
        </div>
        <button className="admin-button" onClick={() => setShowPreview((v) => !v)}>
          <Eye size={18} />
          {showPreview ? 'Close preview' : 'View TV'}
        </button>
      </div>
      <p>
        Open this address in the TV’s browser. Arrange and save here; the TV displays your saved
        choice.
      </p>
      <div className="admin-actions admin-tv-address">
        <a href={screenUrl} target="_blank" rel="noreferrer">
          {screenUrl}
        </a>
        <button className="admin-button" onClick={() => copy(screenUrl)}>
          Copy TV address
        </button>
      </div>
      {showPreview && <TvPreview screenId={screenId} label={screen.label} />}
      {message && <p role="status">{message}</p>}
      {!form ? (
        <button className="admin-button" onClick={load}>
          Load TV settings
        </button>
      ) : (
        <>
          <section className="admin-panel">
            <h3>Display</h3>
            <p>
              Currently saved: {tvScene(data.settings) === 'teaching' ? 'Class / Teach' : 'Normal'}
              {dirty ? ' · unsaved changes' : ''}
            </p>
            <div className="admin-tv-modes">
              {[['normal', 'Normal'], ...(hall ? [['teaching', 'Class / Teach']] : [])].map(
                ([id, name]) => (
                  <button
                    type="button"
                    className={`admin-button ${form.scene_mode === id ? 'primary' : ''}`}
                    disabled={busy}
                    aria-pressed={form.scene_mode === id}
                    key={id}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        scene_mode: id,
                        class_until:
                          id === 'normal'
                            ? ''
                            : minutes === '0'
                              ? ''
                              : new Date(Date.now() + Number(minutes) * 60000).toISOString(),
                      }))
                    }
                  >
                    {name}
                  </button>
                ),
              )}
            </div>
            <p>
              {form.scene_mode === 'normal'
                ? 'Posters and the timetable, with automatic prayer, Jummah and Ramadan notices.'
                : 'Your saved scenes. Automatic prayer and seasonal notices stay paused.'}
            </p>
            {form.scene_mode === 'teaching' && (
              <label>
                Return to Normal
                <select
                  value={minutes}
                  disabled={busy}
                  onChange={(e) => {
                    setMinutes(e.target.value);
                    update(
                      'class_until',
                      e.target.value === '0'
                        ? ''
                        : new Date(Date.now() + Number(e.target.value) * 60000).toISOString(),
                    );
                  }}
                >
                  <option value="0">When I choose Normal and save</option>
                  {[30, 60, 120, 240, 480].map((n) => (
                    <option key={n} value={n}>
                      In {n} minutes
                    </option>
                  ))}
                </select>
                {form.class_until && (
                  <small>
                    Saved end:{' '}
                    {new Date(form.class_until).toLocaleTimeString('en-GB', {
                      timeZone: 'Europe/London',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </small>
                )}
              </label>
            )}
          </section>
          {hall && form.scene_mode === 'teaching' && (
            <SceneEditor value={form} onChange={setForm} disabled={busy} />
          )}
          {hall && sourceSettings && (
            <DeviceInputs
              screenId={screenId}
              settings={sourceSettings}
              inputs={data.inputs || []}
              disabled={dirty || busy || tvScene(sourceSettings) !== 'teaching'}
              onRefresh={() =>
                tvRequest('admin', screenId, {}, { staff: true })
                  .then(setData)
                  .catch((e) => setMessage(e.message))
              }
            />
          )}
          <details open={form.scene_mode === 'normal'} className="admin-panel">
            <summary>Normal posters & automatic notices</summary>
            <NormalSettings form={form} update={update} currentEvents={currentEvents} hall={hall} />
          </details>
          <TvConnections
            screenId={screenId}
            data={data}
            setData={setData}
            form={form}
            update={update}
            run={run}
            busy={busy}
            copy={copy}
          />
          {hall && <SessionOutput screenId={screenId} />}
          <div className="admin-tv-save">
            <span>{dirty ? 'Changes are ready to save.' : 'All changes saved.'}</span>
            <button className="admin-button" disabled={busy} onClick={load}>
              Reload saved
            </button>
            <button
              className="admin-button primary"
              disabled={busy || !dirty}
              onClick={() => save().catch(() => {})}
            >
              {busy ? 'Saving…' : 'Save & update TV'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
