import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { tvRequest } from '@/lib/tvControl';
import useRecording from './useRecording';
import useBroadcast from './useBroadcast';

export default function SessionOutput({ screenId }) {
  const { can } = useAuth();
  const recording = useRecording(),
    broadcast = useBroadcast(screenId);
  const [destinations, setDestinations] = useState([{ platform: 'youtube', url: '', key: '' }]);
  const [message, setMessage] = useState('');
  const relay = import.meta.env.VITE_MEDIA_RELAY_URL;
  if (!can('broadcast')) return null;
  async function openTv() {
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setMessage('Allow a new tab to open the recording view.');
      return;
    }
    tab.opener = null;
    try {
      const data = await tvRequest('preview', screenId, { purpose: 'broadcast' }, { staff: true });
      tab.location.href = `/tv179/${screenId}#preview=${data.deviceToken}`;
    } catch (e) {
      tab.close();
      setMessage(e.message);
    }
  }
  function target(index, key, value) {
    setDestinations((ds) => ds.map((d, i) => (i === index ? { ...d, [key]: value } : d)));
  }
  return (
    <details className="admin-panel">
      <summary>Record or broadcast this session</summary>
      <p>
        Open the TV view in a separate tab, enable its audio, then choose that tab when recording or
        broadcasting. The selected tab’s picture and sound become the output.
      </p>
      <div className="admin-actions">
        <button className="admin-button" onClick={openTv}>
          Open TV tab for recording
        </button>
        <button
          className="admin-button"
          disabled={!recording.recording && !navigator.mediaDevices?.getDisplayMedia}
          onClick={() => (recording.recording ? recording.stop() : recording.recordTv())}
        >
          {recording.recording ? 'Stop recording' : 'Record TV tab'}
        </button>
      </div>
      <p>
        On a phone, use “Record this input” under its camera. Recording the complete TV tab requires
        a supported desktop browser. Recordings stay on your device until downloaded.
      </p>
      {recording.url && (
        <a className="admin-button" href={recording.url} download={recording.name}>
          Download recording
        </a>
      )}
      <p role="status">{message || recording.message}</p>
      <h4>YouTube / TikTok broadcast</h4>
      {!relay ? (
        <p>
          Broadcasting needs the media relay to be configured by your website maintainer. Camera
          sharing and recording work separately.
        </p>
      ) : (
        <>
          <p>
            Use the stream server and key from your platform’s Live Studio. A website cannot sign in
            to those platforms on your behalf. TikTok must enable streaming access on your account.
          </p>
          {destinations.map((d, i) => (
            <fieldset key={i} disabled={broadcast.busy || broadcast.live}>
              <legend>Destination {i + 1}</legend>
              <label>
                Platform
                <select value={d.platform} onChange={(e) => target(i, 'platform', e.target.value)}>
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </label>
              <label>
                Stream server
                <input
                  value={d.url}
                  placeholder="rtmps://…"
                  autoComplete="off"
                  onChange={(e) => target(i, 'url', e.target.value)}
                />
              </label>
              <label>
                Stream key
                <input
                  type="password"
                  autoComplete="new-password"
                  value={d.key}
                  onChange={(e) => target(i, 'key', e.target.value)}
                />
              </label>
            </fieldset>
          ))}
          <div className="admin-actions">
            <button
              className="admin-button"
              disabled={broadcast.busy || broadcast.live}
              onClick={() =>
                setDestinations((ds) =>
                  ds.length === 1
                    ? [...ds, { platform: 'tiktok', url: '', key: '' }]
                    : ds.slice(0, 1),
                )
              }
            >
              {destinations.length === 1 ? 'Add second destination' : 'Remove second destination'}
            </button>
            <button
              className="admin-button"
              disabled={
                broadcast.busy || (!broadcast.live && !navigator.mediaDevices?.getDisplayMedia)
              }
              onClick={() =>
                broadcast.live
                  ? broadcast.stop()
                  : broadcast.start(destinations).then((ok) => {
                      if (ok) setDestinations((ds) => ds.map((d) => ({ ...d, key: '' })));
                    })
              }
            >
              {broadcast.live ? 'Stop broadcast' : 'Choose TV tab & go live'}
            </button>
          </div>
          <p role="status">{broadcast.message}</p>
        </>
      )}
    </details>
  );
}
