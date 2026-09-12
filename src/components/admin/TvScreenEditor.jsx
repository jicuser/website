import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Presentation, Image, Radio, RotateCcw, Eye, X } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { PROGRAMMES } from '@/content/programmes';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import useTvPublisher from '@/hooks/useTvPublisher';
import TvPreview from './TvPreview';
import TvLayoutEditor from './TvLayoutEditor';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { safeWebUrl } from '@/lib/video';
import { londonDate } from '@/lib/timetable';
import { tvScene, normaliseTvSettings } from '../../../supabase/functions/_shared/tv.js';

const MODES = [
  [
    'normal',
    'Normal',
    Image,
    'Posters and prayer reminders. Jummah and Ramadan notices follow the mosque calendar automatically.',
  ],
  ['class', 'Class', Presentation, 'Share a lesson. Prayer notices pause until the class ends.'],
  ['speech', 'Speech', Radio, 'Show the speaker with event posters. Prayer notices continue.'],
];
const button = 'admin-button';
export default function TvScreenEditor({ screenId }) {
  const hall = screenId !== 'shoe-area';
  const screen = TV_SCREENS.find((item) => item.id === screenId);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [now, setNow] = useState(Date.now());
  const preview = useRef(null);
  const editing = useRef(false);
  const sharing = useTvPublisher(screenId);
  const { events } = useHomeLiveContent({ eventLimit: 50 });
  const currentEvents = events.filter(
    (event) => event.event_date >= londonDate() && safeWebUrl(event.poster_url),
  );
  const screenUrl = `${window.location.origin}/tv179/${screenId}`;
  const dirty = Boolean(form && JSON.stringify(form) !== saved);
  editing.current = dirty || busy || sharing.busy;
  const load = useCallback(async () => {
    try {
      const next = await tvRequest('admin', screenId, {}, { staff: true });
      next.settings = normaliseTvSettings(next.settings);
      setData(next);
      setForm(next.settings);
      setSaved(JSON.stringify(next.settings));
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  }, [screenId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let active = true;
    let timer;
    async function refresh() {
      try {
        const next = await tvRequest('admin', screenId, {}, { staff: true });
        next.settings = normaliseTvSettings(next.settings);
        if (active) {
          setData(next);
          if (!editing.current) {
            setForm(next.settings);
            setSaved(JSON.stringify(next.settings));
          }
        }
      } catch {
        /* Keep edits when a background refresh fails. Explicit saves report errors. */
      }
      if (active) timer = setTimeout(refresh, 8000);
    }
    timer = setTimeout(refresh, 8000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [screenId]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (preview.current) preview.current.srcObject = sharing.stream;
  }, [sharing.stream]);
  const persist = useCallback(
    async (settings, stopSharing = false) => {
      if (stopSharing) await sharing.stop();
      const result = await tvRequest('save', screenId, { settings, stopSharing }, { staff: true });
      result.settings = normaliseTvSettings(result.settings);
      setForm(result.settings);
      setSaved(JSON.stringify(result.settings));
      setData((previous) => ({
        ...previous,
        settings: result.settings,
        ...(stopSharing ? { share_session: null } : {}),
      }));
      setMessage('Saved. This TV updates within a few seconds.');
    },
    [screenId, sharing.stop],
  );
  const save = useCallback(async () => {
    try {
      await persist({ ...form, mode: 'posters' }, !form.panels.includes('share'));
    } catch (error) {
      setMessage(error.message);
      throw error;
    }
  }, [form, persist]);
  useRegisterAdminSave(save, dirty, `Update ${screen.label}`);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  async function run(task) {
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function normal() {
    await sharing.stop();
    const next = await tvRequest('normal', screenId, {}, { staff: true });
    setForm(next.settings);
    setSaved(JSON.stringify(next.settings));
    setData((previous) => ({ ...previous, settings: next.settings, share_session: null }));
    setMessage('Normal display restored.');
  }
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Link copied.');
    } catch {
      setMessage('Select and copy the link below.');
    }
  }
  const resolvedScene = form ? tvScene(form, now) : 'normal';
  const scene = resolvedScene === 'ramadan' ? 'normal' : resolvedScene;
  const liveSession =
    sharing.stream || (data?.share_session && Date.parse(data.share_expires) > now);
  return (
    <div className="admin-tv-editor">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">TV SCREENS</span>
          <h2>{screen.label}</h2>
        </div>
        <button className={button} onClick={() => setShowPreview((value) => !value)}>
          <Eye size={18} />
          {showPreview ? 'Close preview' : 'Preview TV'}
        </button>
      </div>
      <p>
        Open this address in the TV’s web browser. Choose what it shows here, then press Update this
        TV.
      </p>
      <div className="admin-actions admin-tv-address">
        <a href={screenUrl} target="_blank" rel="noreferrer">
          {screenUrl}
        </a>
        <button className={button} onClick={() => copy(screenUrl)}>
          Copy TV address
        </button>
      </div>
      {showPreview && <TvPreview key={screenId} screenId={screenId} label={screen.label} />}
      {message && (
        <p className="admin-success" role="status">
          {message}
        </p>
      )}
      {!form ? (
        <button className={button} onClick={load}>
          Load TV settings
        </button>
      ) : (
        <>
          <section className="admin-panel">
            <div className="admin-heading">
              <div>
                <h3>{hall ? '1. Choose a mode' : 'Times & posters'}</h3>
                <p>
                  {hall
                    ? `Current mode: ${MODES.find(([id]) => id === tvScene(data.settings, now))?.[1] || 'Normal'}`
                    : 'The shoe area always shows the timetable and posters.'}
                </p>
              </div>
              {hall && (
                <button
                  className={button}
                  disabled={busy || sharing.busy}
                  onClick={() => run(normal)}
                >
                  <RotateCcw size={16} />
                  Back to normal
                </button>
              )}
            </div>
            {hall && (
              <>
                <div className="admin-tv-modes">
                  {MODES.map(([id, label, Icon]) => (
                    <button
                      key={id}
                      aria-pressed={scene === id}
                      disabled={busy || sharing.busy}
                      onClick={() =>
                        run(() =>
                          id === 'normal'
                            ? normal()
                            : persist(
                                {
                                  ...form,
                                  scene_mode: id,
                                  mode: 'posters',
                                  notice_mode: 'off',
                                  class_until: ['class', 'speech'].includes(id)
                                    ? new Date(Date.now() + minutes * 60000).toISOString()
                                    : '',
                                },
                                true,
                              ),
                        )
                      }
                    >
                      <Icon size={22} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <p className="admin-tv-help">{MODES.find(([id]) => id === scene)?.[3]}</p>
                {['class', 'speech'].includes(scene) && (
                  <label>
                    Return to normal
                    <select
                      value={minutes}
                      disabled={busy}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setMinutes(value);
                        run(() =>
                          persist({
                            ...form,
                            class_until: new Date(Date.now() + value * 60000).toISOString(),
                          }),
                        );
                      }}
                    >
                      <option value="30">After 30 minutes</option>
                      <option value="60">After 1 hour</option>
                      <option value="120">After 2 hours</option>
                      <option value="240">After 4 hours</option>
                    </select>
                    <small>
                      Ends{' '}
                      {new Date(form.class_until).toLocaleTimeString('en-GB', {
                        timeZone: 'Europe/London',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}{' '}
                      · London time
                    </small>
                  </label>
                )}
              </>
            )}
          </section>
          {hall && scene !== 'normal' && (
            <section className="admin-panel">
              <h3>2. What should appear?</h3>
              <TvLayoutEditor value={form} onChange={update} disabled={busy || sharing.busy} />
              {form.panels.includes('youtube') && (
                <label>
                  YouTube link
                  <input
                    type="url"
                    value={form.youtube_url}
                    onChange={(event) => update('youtube_url', event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                </label>
              )}
              {form.panels.includes('camera') && (
                <>
                  <label>
                    Installed camera stream
                    <input
                      type="url"
                      value={form.camera_url}
                      onChange={(event) => update('camera_url', event.target.value)}
                      placeholder="https://…/live.m3u8"
                    />
                  </label>
                  <label>
                    Stream format
                    <select
                      value={form.camera_protocol}
                      onChange={(event) => update('camera_protocol', event.target.value)}
                    >
                      <option value="hls">HLS</option>
                      <option value="whep">WebRTC (WHEP)</option>
                    </select>
                  </label>
                  <p>
                    Camera links stay private to approved TV browsers. A local RTSP camera needs an
                    HTTPS browser stream from a relay.
                  </p>
                </>
              )}
              {form.panels.includes('share') && (
                <>
                  <div className="admin-actions">
                    <button
                      className={button}
                      disabled={
                        busy ||
                        sharing.busy ||
                        dirty ||
                        Boolean(sharing.stream) ||
                        !navigator.mediaDevices?.getDisplayMedia
                      }
                      onClick={() => sharing.start('screen')}
                    >
                      <Presentation size={18} />
                      Share screen
                    </button>
                    <button
                      className={button}
                      disabled={
                        busy ||
                        sharing.busy ||
                        dirty ||
                        Boolean(sharing.stream) ||
                        !navigator.mediaDevices?.getUserMedia
                      }
                      onClick={() => sharing.start('camera')}
                    >
                      <Camera size={18} />
                      This device’s camera
                    </button>
                    {(liveSession || sharing.busy) && (
                      <button
                        className={button}
                        onClick={() =>
                          run(async () => {
                            if (sharing.stream || sharing.busy) await sharing.stop();
                            else
                              await tvRequest(
                                'stop',
                                screenId,
                                { sessionId: data.share_session },
                                { staff: true },
                              );
                            setData((old) => ({ ...old, share_session: null }));
                          })
                        }
                      >
                        <X size={16} />
                        Stop sharing
                      </button>
                    )}
                  </div>
                  <p className="admin-tv-help">
                    Keep this page open while sharing. Update this TV first, then start sharing.{' '}
                    {!navigator.mediaDevices?.getDisplayMedia &&
                      'This browser supports camera sharing but cannot share the whole screen.'}
                  </p>
                  <p role="status">{sharing.message}</p>
                  {sharing.stream && (
                    <video
                      ref={preview}
                      autoPlay
                      playsInline
                      muted
                      className="admin-share-preview"
                      aria-label="Your source preview"
                    />
                  )}
                </>
              )}
              <details>
                <summary>Event title & message</summary>
                <label>
                  Title
                  <input
                    maxLength={120}
                    value={form.event_title || ''}
                    onChange={(event) => update('event_title', event.target.value)}
                  />
                </label>
                <label>
                  Message
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={form.event_message || ''}
                    onChange={(event) => update('event_message', event.target.value)}
                  />
                </label>
              </details>
            </section>
          )}
          <section className="admin-panel">
            <h3>What stays visible</h3>
            <div className="admin-tv-sources">
              {[
                ['show_times', 'Salah timetable'],
                ['show_next', 'Next prayer reminder'],
                ['show_clock', 'Current clock'],
              ].map(([key, label]) => (
                <label className="admin-check" key={key}>
                  <input
                    type="checkbox"
                    checked={form[key] !== false}
                    onChange={(event) => update(key, event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
          <details className="admin-panel" open={scene === 'normal'}>
            <summary>Posters & rotation</summary>
            <p>
              Tick the posters for this TV. They fill the poster panels and replace any feed that
              cannot play.
            </p>
            <div className="admin-poster-picker">
              {PROGRAMMES.map((item) => (
                <label key={item.id}>
                  <img src={item.image} alt="" loading="lazy" />
                  <span>
                    <input
                      type="checkbox"
                      checked={form.poster_ids.includes(item.id)}
                      onChange={(event) =>
                        update(
                          'poster_ids',
                          event.target.checked
                            ? [...form.poster_ids, item.id]
                            : form.poster_ids.filter((id) => id !== item.id),
                        )
                      }
                    />
                    {item.title}
                  </span>
                </label>
              ))}
            </div>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.include_events}
                onChange={(event) => update('include_events', event.target.checked)}
              />
              Include upcoming event posters
            </label>
            {form.include_events &&
              (currentEvents.length ? (
                <div className="admin-poster-picker">
                  {currentEvents.map((event) => (
                    <div key={event.id}>
                      <img src={event.poster_url} alt={event.title} loading="lazy" />
                      <span>{event.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No upcoming event posters are published.</p>
              ))}
            <label>
              Change poster every
              <select
                value={form.rotation_seconds}
                onChange={(event) => update('rotation_seconds', Number(event.target.value))}
              >
                {[...new Set([10, 15, 20, 30, 60, form.rotation_seconds])]
                  .sort((a, b) => a - b)
                  .map((value) => (
                    <option key={value} value={value}>
                      {value} seconds
                    </option>
                  ))}
              </select>
            </label>
          </details>
          {hall && (
            <details className="admin-panel">
              <summary>Automatic prayers, Jummah & Ramadan</summary>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.prayer_enabled !== false}
                  onChange={(event) => update('prayer_enabled', event.target.checked)}
                />
                Automatic prayer reminders
              </label>
              <p>
                At Jama‘ah: silence your phone. Dhikr begins 5 minutes later, or 10 minutes after
                Maghrib. Posters return 20 minutes after Jama‘ah. Class mode pauses this sequence.
              </p>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.auto_jummah !== false}
                  onChange={(event) => update('auto_jummah', event.target.checked)}
                />
                Automatically show Friday’s Jummah welcome
              </label>
              <p>
                In Normal mode: from one hour before the first Jummah until 20 minutes after the
                last.
              </p>
              <label>
                Ramadan calendar
                <select
                  value={form.ramadan_calendar}
                  onChange={(event) => update('ramadan_calendar', event.target.value)}
                >
                  <option value="auto">Automatic — Islamic calendar</option>
                  <option value="on">Ramadan is on</option>
                  <option value="off">Ramadan is off</option>
                </select>
              </label>
              {form.ramadan_calendar === 'auto' && (
                <label>
                  Local moon calendar adjustment
                  <select
                    value={form.calendar_offset}
                    onChange={(event) => update('calendar_offset', Number(event.target.value))}
                  >
                    {[-2, -1, 0, 1, 2].map((value) => (
                      <option key={value} value={value}>
                        {value === 0
                          ? 'No adjustment'
                          : `${value > 0 ? '+' : ''}${value} day${Math.abs(value) > 1 ? 's' : ''}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Notice override in Normal mode
                <select
                  value={form.notice_mode || 'off'}
                  onChange={(event) => update('notice_mode', event.target.value)}
                >
                  <option value="off">Automatic</option>
                  <option value="jummah">Keep Jummah welcome on</option>
                  <option value="taraweeh">Keep Taraweeh du‘a on</option>
                </select>
              </label>
              <label>
                Jummah message
                <textarea
                  rows={3}
                  maxLength={1200}
                  value={form.jummah_notice || ''}
                  onChange={(event) => update('jummah_notice', event.target.value)}
                />
              </label>
              <label>
                Ramadan du‘a (optional)
                <textarea
                  rows={3}
                  dir="auto"
                  maxLength={1200}
                  value={form.taraweeh_dua || ''}
                  onChange={(event) => update('taraweeh_dua', event.target.value)}
                />
              </label>
              <p>
                Blank uses Qur’an 2:201. During Ramadan, Normal shows du‘a 20–40 minutes after Isha
                Jama‘ah, then alternates fasting times and posters. Class and Speech use your
                selected panels.
              </p>
            </details>
          )}
          <details className="admin-panel">
            <summary>TV sound & private video access</summary>
            <a className={button} href={screenUrl} target="_blank" rel="noreferrer">
              Open TV display ↗
            </a>
            <p>Use landscape orientation on the TV. Posters and video fit without cropping.</p>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.muted}
                onChange={(event) => update('muted', event.target.checked)}
              />
              Mute TV audio
            </label>
            {hall && (
              <>
                <h4>Enable camera & sharing on this TV</h4>
                <p>
                  For private video, open the approval link once in the TV’s browser. It approves
                  this browser for 90 days; there is no Bluetooth connection or app to install. The
                  link works once and expires in 10 minutes.
                </p>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    run(async () =>
                      setPairing(await tvRequest('pair-code', screenId, {}, { staff: true })),
                    )
                  }
                >
                  Create private TV link
                </button>
                {pairing && (
                  <div className="admin-actions">
                    <input
                      readOnly
                      aria-label="Private TV approval link"
                      value={`${screenUrl}#pair=${pairing.code}`}
                      onFocus={(event) => event.target.select()}
                    />
                    <button
                      className={button}
                      onClick={() => copy(`${screenUrl}#pair=${pairing.code}`)}
                    >
                      Copy link
                    </button>
                  </div>
                )}
                <ul className="admin-device-list">
                  {data.devices
                    .filter(
                      (device) =>
                        Date.parse(device.expires_at) - Date.parse(device.created_at) > 3600000,
                    )
                    .map((device, index) => (
                      <li key={device.id}>
                        TV {index + 1}
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await tvRequest(
                                'revoke',
                                screenId,
                                { deviceId: device.id },
                                { staff: true },
                              );
                              setData((previous) => ({
                                ...previous,
                                devices: previous.devices.filter((item) => item.id !== device.id),
                              }));
                            })
                          }
                        >
                          Disconnect
                        </button>
                      </li>
                    ))}
                </ul>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      setData(await tvRequest('admin', screenId, {}, { staff: true }));
                    })
                  }
                >
                  Refresh connections
                </button>
              </>
            )}
          </details>
          {dirty && (
            <div className="admin-tv-save">
              <span>Unsaved changes</span>
              <button
                className="admin-button primary"
                disabled={busy || sharing.busy}
                onClick={() => run(save)}
              >
                Update this TV
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
