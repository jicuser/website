import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';

export default function TvConnections({ screenId, data, setData, form, update, run, busy }) {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  // Short previews are not physical TVs and should not clutter the connection list.
  const devices = data.devices.filter(
    (device) => Date.parse(device.expires_at) - Date.parse(device.created_at) > 86400000,
  );
  return (
    <details className="admin-panel" id="tv-connection">
      <summary>
        Connect TV · {devices.length ? `${devices.length} saved` : 'not connected yet'}
      </summary>
      <p>
        Use the same TV address every time. On the TV, choose Connect TV and enter its code here
        once. A second phone can connect in the same way for testing.
      </p>
      <div className="admin-actions">
        <label>
          Code shown on the TV
          <input
            inputMode="numeric"
            autoComplete="off"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            placeholder="123456"
            disabled={busy}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />
        </label>
        <button
          className="admin-button primary"
          disabled={busy || code.length !== 6}
          onClick={() =>
            run(async () => {
              await tvRequest('approve-setup', screenId, { code }, { staff: true });
              setCode('');
              setMessage(
                'TV connected. Keep its browser open; saved changes appear automatically.',
              );
              setData(await tvRequest('admin', screenId, {}, { staff: true }));
            })
          }
        >
          Connect this TV
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <p>
        Saving or clearing a scene never changes the address. Reconnect only if browser storage is
        cleared, access is removed, or its approval expires.
      </p>
      <ul className="admin-device-list">
        {devices.map((device, index) => {
          const online = Date.now() - Date.parse(device.last_seen_at) < 90000;
          const current = Date.parse(device.applied_revision) === Date.parse(data.updated_at);
          return (
            <li key={device.id}>
              <span>
                TV {index + 1}
                <small className="block">
                  {online
                    ? current
                      ? 'Online · latest save received'
                      : 'Online · waiting for latest save'
                    : 'Browser not seen recently'}
                </small>
              </span>
              <button
                className="admin-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await tvRequest('revoke', screenId, { deviceId: device.id }, { staff: true });
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
          );
        })}
      </ul>
      {form.scene_mode === 'teaching' && (
        <label className="admin-check">
          <input
            type="checkbox"
            checked={form.muted}
            onChange={(event) => update('muted', event.target.checked)}
          />
          Mute TV audio
        </label>
      )}
    </details>
  );
}
