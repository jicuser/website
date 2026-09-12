import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import usePosters from '@/hooks/usePosters';

export default function TvScreenEditor({ screenId }) {
  const { user } = useAuth();
  const programmes = usePosters();
  const draftKey = `jic-tv-draft:${user.id}:${screenId}`;
  const hall = screenId !== 'shoe-area';
  const screen = TV_SCREENS.find((item) => item.id === screenId);
  const [data, setData] = useState(null),
    [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null),
    [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
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
    const settings = normaliseTvSettings(next.settings);
    // Saved empty or expired classes are Normal; unsaved scene drafts stay editable.
    next = { ...next, settings: { ...settings, scene_mode: tvScene(settings) } };
    setData(next);
    setForm(next.settings);
    setBaseline(next);
  }, []);
  const load = useCallback(async () => {
    try {
      const next = await tvRequest('admin', screenId, {}, { staff: true });
      accept(next);
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey));
        if (draft?.settings && draft?.baseline) {
          setForm(normaliseTvSettings(draft.settings));
          setBaseline(draft.baseline);
          setMessage('Draft restored. Present when ready, or clear the draft.');
        } else setMessage('');
      } catch {
        setMessage('');
      }
    } catch (e) {
      setMessage(e.message);
    }
  }, [screenId, accept, draftKey]);
  useEffect(() => {
    if (!form || !baseline) return;
    try {
      if (dirty)
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            settings: form,
            baseline: { settings: baseline.settings, updated_at: baseline.updated_at },
          }),
        );
      else localStorage.removeItem(draftKey);
    } catch {
      setMessage('This browser could not keep the draft. Save before leaving this page.');
    }
  }, [form, baseline, dirty, draftKey]);
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
      setMessage(
        `Saved ${tvScene(next.settings) === 'teaching' ? 'Class / Teach' : 'Normal'}. Connected viewers update within a few seconds; check Connected displays.`,
      );
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
  // Publishing uses the latest saved server state, even when this browser has an
  // unrelated draft. The draft's baseline is only for detecting save conflicts.
  const sourceSettings = data?.settings;
  return (
    <div className="admin-tv-editor">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">HALL STREAM</span>
          <h2>{screen.label}</h2>
        </div>
      </div>
      <p>
        {hall
          ? 'Keep this permanent webpage open on a TV, laptop or phone. Normal is public. In Class / Teach, viewers enter the session code once; Present updates their open webpage.'
          : 'Open this webpage for posters and times. Save applies your changes.'}
      </p>
      {hall && (
        <p>
          Normal shows posters and prayer notices. Class / Teach shows your scene. Presenting an
          empty scene returns the display to Normal.
        </p>
      )}
      <div className="admin-actions admin-tv-address">
        <a href={screenUrl} target="_blank" rel="noreferrer">
          {screenUrl}
        </a>
        <button className="admin-button" onClick={() => copy(screenUrl)}>
          Copy display webpage address
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {!form ? (
        <button className="admin-button" onClick={load}>
          Retry loading hall stream
        </button>
      ) : (
        <>
          {hall && (
            <TvConnections
              screenId={screenId}
              data={data}
              setData={setData}
              run={run}
              busy={busy}
            />
          )}
          <section className="admin-panel">
            <h3>Display mode</h3>
            {hall && (
              <div className="admin-actions">
                <button
                  className="admin-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Start a new presentation? Previous live inputs and viewing access will end. Saved scenes are kept; viewers will need the new session code.',
                      )
                    )
                      return;
                    run(async () => {
                      const latest = await tvRequest('admin', screenId, {}, { staff: true });
                      const normal = await tvRequest(
                        'normal',
                        screenId,
                        { expectedUpdatedAt: latest.updated_at },
                        { staff: true },
                      );
                      accept({ ...latest, ...normal, inputs: [] });
                      setForm({ ...normal.settings, scene_mode: 'teaching', class_until: '' });
                      setMessage(
                        'New presentation draft ready. Choose your scene, then press Present. Previous inputs and viewing access have ended. A new code will appear when you press Present.',
                      );
                    });
                  }}
                >
                  Start new presentation
                </button>
                {tvScene(data.settings) === 'teaching' && (
                  <button
                    className="admin-button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const normal = await tvRequest(
                          'normal',
                          screenId,
                          { expectedUpdatedAt: data.updated_at },
                          { staff: true },
                        );
                        accept({ ...data, ...normal, inputs: [] });
                        setMessage('Normal is showing. Presentation inputs have stopped.');
                      })
                    }
                  >
                    Return to Normal now
                  </button>
                )}
              </div>
            )}
            <p>
              Currently showing:{' '}
              {tvScene(data.settings) === 'teaching' ? 'Class / Teach' : 'Normal'}
              {dirty ? ' · draft changes below are not live yet' : ''}
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
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.muted}
                  disabled={busy}
                  onChange={(event) => update('muted', event.target.checked)}
                />
                Mute display audio
              </label>
            )}
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
          {form.scene_mode === 'normal' && (
            <section className="admin-panel">
              <h3>Preview · Normal draft</h3>
              <p>Shows your choices below. Save & show Normal updates the open display webpage.</p>
              <TvPreview screenId={screenId} label={screen.label} settings={form} />
            </section>
          )}
          {hall && form.scene_mode === 'teaching' && (
            <SceneEditor
              value={form}
              onChange={setForm}
              disabled={busy}
              screenId={screenId}
              posters={[
                ...programmes,
                ...currentEvents.map((e) => ({
                  id: `event-${e.id}`,
                  title: e.title,
                  image: e.poster_url,
                  alt: e.title,
                })),
              ]}
            />
          )}
          {hall && sourceSettings && (
            <div hidden={form.scene_mode !== 'teaching'}>
              <DeviceInputs
                screenId={screenId}
                settings={sourceSettings}
                inputs={data.inputs || []}
                disabled={busy}
                hasDraft={dirty}
                relayConfigured={data.relayConfigured}
                onRefresh={() =>
                  tvRequest('admin', screenId, {}, { staff: true })
                    .then(setData)
                    .catch((e) => setMessage(e.message))
                }
              />
            </div>
          )}
          {form.scene_mode === 'normal' && (
            <section>
              <NormalSettings
                form={form}
                update={update}
                currentEvents={currentEvents}
                hall={hall}
              />
            </section>
          )}
          {hall && form.scene_mode === 'teaching' && <SessionOutput screenId={screenId} />}
          <div className="admin-tv-save">
            <span>
              {dirty
                ? 'Draft kept on this browser. Press Present or Save & show Normal to update viewers.'
                : 'All changes saved.'}
            </span>
            <button
              className="admin-button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Clear your draft and restore the saved display settings?'))
                  return;
                localStorage.removeItem(draftKey);
                load();
              }}
            >
              Clear draft
            </button>
            <button
              className="admin-button"
              disabled={busy}
              onClick={() => {
                try {
                  localStorage.setItem(
                    draftKey,
                    JSON.stringify({
                      settings: form,
                      baseline: { settings: baseline.settings, updated_at: baseline.updated_at },
                    }),
                  );
                  setMessage(
                    'Draft saved on this browser. Viewers will see it when you press Present.',
                  );
                } catch {
                  setMessage('This browser could not save the draft. Keep this page open.');
                }
              }}
            >
              Save draft
            </button>
            <button
              className="admin-button primary"
              disabled={busy}
              onClick={() => save().catch(() => {})}
            >
              {busy
                ? 'Updating…'
                : form.scene_mode === 'teaching'
                  ? 'Present'
                  : 'Save & show Normal'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
