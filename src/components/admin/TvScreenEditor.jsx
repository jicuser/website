import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { PROGRAMMES } from '@/content/programmes';
import { useRegisterAdminSave } from '@/context/AdminSaveContext';
import useTvPublisher from '@/hooks/useTvPublisher';

const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';
const button =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50';
const panel = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-6';

export default function TvScreenEditor({ screenId }) {
  const screen = TV_SCREENS.find((item) => item.id === screenId);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pairing, setPairing] = useState(null);
  const preview = useRef(null);
  const sharing = useTvPublisher(screenId);
  const screenUrl = `${window.location.origin}/tv179/${screenId}`;
  const load = useCallback(async () => {
    try {
      const next = await tvRequest('admin', screenId, {}, { staff: true });
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
    if (preview.current) preview.current.srcObject = sharing.stream;
  }, [sharing.stream]);
  const save = useCallback(async () => {
    try {
      const result = await tvRequest('save', screenId, { settings: form }, { staff: true });
      setForm(result.settings);
      setSaved(JSON.stringify(result.settings));
      setMessage('Screen settings saved. The TV updates within a few seconds.');
    } catch (error) {
      setMessage(error.message);
      throw error;
    }
  }, [screenId, form]);
  useRegisterAdminSave(
    save,
    Boolean(form && JSON.stringify(form) !== saved),
    `Save ${screen.label}`,
  );
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
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copied.');
    } catch {
      setMessage('Select and copy the link below.');
    }
  }
  const activeRemote = data?.share_session && new Date(data.share_expires).getTime() > Date.now();
  return (
    <div className="space-y-5">
      <div>
        <span className="admin-eyebrow">TV SCREENS</span>
        <h2 className="text-2xl font-bold">{screen.label}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Settings apply only to this screen. Prayer times and the 12-hour clock stay visible.
        </p>
      </div>
      {message && (
        <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-900">
          {message}
        </p>
      )}
      {!form ? (
        <button className={button} onClick={load}>
          Load screen settings
        </button>
      ) : (
        <>
          <section className={panel}>
            <h3 className="mb-3 text-lg font-bold">Display</h3>
            <a
              className="break-all text-sm underline"
              href={screenUrl}
              target="_blank"
              rel="noreferrer"
            >
              {screenUrl}
            </a>
            <label className="mt-4 block text-sm font-semibold">
              Show on this TV
              <select
                className={`${input} mt-1`}
                value={form.mode}
                onChange={(event) => update('mode', event.target.value)}
              >
                <option value="schedule">Posters and the website livestream</option>
                <option value="posters">Posters only</option>
                <option value="youtube">A separate YouTube stream</option>
                <option value="camera">Local camera (paired TVs only)</option>
              </select>
            </label>
            {form.mode === 'youtube' && (
              <label className="mt-4 block text-sm font-semibold">
                YouTube video or live link
                <input
                  className={`${input} mt-1`}
                  type="url"
                  value={form.youtube_url}
                  onChange={(event) => update('youtube_url', event.target.value)}
                />
              </label>
            )}
            {form.mode === 'camera' && (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-semibold">
                  Camera format
                  <select
                    className={`${input} mt-1`}
                    value={form.camera_protocol}
                    onChange={(event) => update('camera_protocol', event.target.value)}
                  >
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="whep">WebRTC (WHEP)</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  HTTPS camera stream URL
                  <input
                    className={`${input} mt-1`}
                    type="url"
                    value={form.camera_url}
                    onChange={(event) => update('camera_url', event.target.value)}
                  />
                </label>
                <p className="text-sm text-slate-600">
                  Use a stream reachable from the TV’s Wi-Fi. RTSP cameras need a local HLS or
                  WebRTC relay with HTTPS and browser access enabled. The camera link is sent only
                  to paired TVs.
                </p>
              </div>
            )}
            <fieldset className="mt-5 space-y-2">
              <legend className="mb-2 text-sm font-bold">Posters</legend>
              {PROGRAMMES.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm">
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
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.include_events}
                  onChange={(event) => update('include_events', event.target.checked)}
                />
                Include upcoming event posters
              </label>
            </fieldset>
            <label className="mt-4 block text-sm font-semibold">
              Seconds between posters
              <input
                className={`${input} mt-1 max-w-32`}
                type="number"
                min="5"
                max="300"
                value={form.rotation_seconds}
                onChange={(event) => update('rotation_seconds', Number(event.target.value))}
              />
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.muted}
                onChange={(event) => update('muted', event.target.checked)}
              />
              Mute TV audio (helps automatic playback)
            </label>
            <button
              className={`${button} mt-5`}
              disabled={busy || JSON.stringify(form) === saved}
              onClick={() => run(save)}
            >
              Save screen settings
            </button>
          </section>
          <section className={panel}>
            <h3 className="text-lg font-bold">Pair a TV</h3>
            <p className="my-2 text-sm text-slate-600">
              Pair each TV once to allow private screen and camera sharing. Open the pairing link on
              the TV, or paste its code into “Pair TV” on the display. Links work once and expire
              after 10 minutes.
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
              Create pairing link
            </button>
            {pairing && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm">
                  Pairing link
                  <input
                    readOnly
                    className={input}
                    value={`${screenUrl}#pair=${pairing.code}`}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <button
                  className={button}
                  onClick={() => copy(`${screenUrl}#pair=${pairing.code}`)}
                >
                  Copy link
                </button>
                <label className="block text-sm">
                  Pairing code
                  <input
                    readOnly
                    className={input}
                    value={pairing.code}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
              </div>
            )}
            <h4 className="mb-2 mt-5 text-sm font-bold">Paired TVs</h4>
            {!data.devices.length && (
              <p className="text-sm text-slate-600">No paired TVs yet. Refresh after pairing.</p>
            )}
            <ul className="space-y-2">
              {data.devices.map((device, index) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    TV {index + 1} · paired{' '}
                    {new Date(device.created_at).toLocaleDateString('en-GB')}
                  </span>
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
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
            <button
              className={`${button} mt-3`}
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const next = await tvRequest('admin', screenId, {}, { staff: true });
                  setData(next);
                })
              }
            >
              Refresh paired TVs
            </button>
          </section>
          <section className={panel}>
            <h3 className="text-lg font-bold">Share live to {screen.label}</h3>
            <p className="my-2 text-sm text-slate-600">
              Keep this admin page open while sharing. Stopping returns the TV to its saved display.
              Phone camera sharing is silent.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className={button}
                disabled={
                  sharing.busy ||
                  Boolean(sharing.stream) ||
                  !navigator.mediaDevices?.getDisplayMedia
                }
                onClick={() => sharing.start('screen')}
              >
                Share laptop screen
              </button>
              <button
                className={button}
                disabled={
                  sharing.busy || Boolean(sharing.stream) || !navigator.mediaDevices?.getUserMedia
                }
                onClick={() => sharing.start('camera')}
              >
                Share this camera
              </button>
              {(sharing.stream || sharing.busy) && (
                <button className={button} onClick={sharing.stop}>
                  Stop sharing
                </button>
              )}
              {!sharing.stream && activeRemote && (
                <button
                  className={button}
                  onClick={() =>
                    run(async () => {
                      await tvRequest(
                        'stop',
                        screenId,
                        { sessionId: data.share_session },
                        { staff: true },
                      );
                      setData((previous) => ({ ...previous, share_session: null }));
                    })
                  }
                >
                  Stop existing session
                </button>
              )}
            </div>
            {!navigator.mediaDevices?.getDisplayMedia && (
              <p className="mt-3 text-sm text-slate-600">
                This browser cannot share the phone’s whole screen. Use the camera button here, or
                native AirPlay/Cast for whole-phone mirroring.
              </p>
            )}
            <p role="status" className="mt-3 text-sm">
              {sharing.message}
            </p>
            {sharing.stream && (
              <video
                ref={preview}
                autoPlay
                playsInline
                muted
                className="mt-3 max-h-72 w-full rounded-lg bg-black"
                aria-label="Your sharing preview"
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
