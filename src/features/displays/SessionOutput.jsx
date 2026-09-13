import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { tvRequest } from '@/lib/tvControl';
import useBroadcast from './useBroadcast';

export default function SessionOutput({ screenId }) {
  const { can } = useAuth();
  const broadcast = useBroadcast(screenId);
  const [destinations, setDestinations] = useState([{ platform: 'youtube', url: '', key: '' }]);
  const [message, setMessage] = useState('');
  const relay = import.meta.env.VITE_MEDIA_RELAY_URL;
  if (!can('broadcast')) return null;
  async function openTv() {
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setMessage('Allow a new tab to open the display view.');
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
      <summary>
        <span className="jic-prompt">Go live on YouTube / TikTok</span>
      </summary>
      <p>
        Broadcast the finished display picture and sound to your channel from a desktop browser.
        Keep your broadcasting laptop running.
      </p>
      <div className="admin-actions">
        <button className="admin-button" onClick={openTv}>
          Open finished display view
        </button>
      </div>
      <p>
        Use a desktop browser: open the display view, enable its sound, then select that tab and
        share its audio when going live. Do not add the same outgoing YouTube broadcast back into
        the scene, because it would repeat its own picture and sound.
      </p>
      <p role="status">{message}</p>
      <h4>
        <span className="jic-prompt">YouTube / TikTok broadcast</span>
      </h4>
      {!relay ? (
        <p>
          Website broadcasting is not connected yet. A broadcast relay must be set up before you can
          go live here. You can also use OBS to send the finished display view to YouTube.
        </p>
      ) : (
        <>
          <p>
            Enter the stream server and key from your platform’s Live Studio. TikTok streaming
            access must be enabled on your account.
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
                <span className="jic-prompt">Stream server</span>
                <input
                  value={d.url}
                  placeholder="rtmps://…"
                  autoComplete="off"
                  onChange={(e) => target(i, 'url', e.target.value)}
                />
              </label>
              <label>
                <span className="jic-prompt">Stream key</span>
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
              className={`admin-button ${broadcast.live ? 'stream-end' : 'stream-start'}`}
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
              {broadcast.live ? 'Stop broadcast' : 'Choose display tab & go live'}
            </button>
          </div>
          <p role="status">{broadcast.message}</p>
        </>
      )}
      <p>
        Find your stream server and key in your platform’s Live Studio. Keep the key private; it is
        only needed to broadcast to your channel.
      </p>
      <a href="https://support.google.com/youtube/answer/2907883" target="_blank" rel="noreferrer">
        YouTube setup instructions ↗
      </a>
    </details>
  );
}
