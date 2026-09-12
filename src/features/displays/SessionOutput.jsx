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
      <summary>Go live on YouTube / TikTok</summary>
      <p>
        This sends the finished display picture and sound to your channel. Camera and screen sharing
        inside the mosque do not need a stream key. Keep your broadcasting laptop running.
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
      <h4>YouTube / TikTok broadcast</h4>
      {!relay ? (
        <p>
          Website broadcasting is not connected yet. A relay is the sending service that converts
          the display picture and forwards it to YouTube or TikTok. It needs to be installed before
          “Go live” can work. Your existing OBS computer can also capture the finished display view
          and send it directly to YouTube.
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
              {broadcast.live ? 'Stop broadcast' : 'Choose display tab & go live'}
            </button>
          </div>
          <p role="status">{broadcast.message}</p>
        </>
      )}
      <p>
        A stream key is a private code supplied by YouTube or TikTok, not by this website. For
        YouTube, open YouTube Studio → Create → Go live → Stream, then copy the stream URL and key.
        Use it only for the outgoing broadcast.
      </p>
      <a href="https://support.google.com/youtube/answer/2907883" target="_blank" rel="noreferrer">
        YouTube setup instructions ↗
      </a>
    </details>
  );
}
