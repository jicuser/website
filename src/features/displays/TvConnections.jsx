import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
const button = 'admin-button';
export default function TvConnections({ screenId, data, setData, form, update, run, busy, copy }) {
  const hall = screenId !== 'shoe-area';
  const screenUrl = `${window.location.origin}/tv179/${screenId}`;
  const [pairing, setPairing] = useState(null);
  return (
    <details className="admin-panel">
      <summary>Connect TV & sound</summary>
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
          <h4>Approve a TV browser for Class / Teach</h4>
          <p>
            The plain TV address shows public posters and times. Each TV browser needs its own
            approval to show your saved class scene, screen sharing and cameras.
          </p>
          <ol>
            <li>Create an approval link below and copy it.</li>
            <li>Open that link in the TV’s browser within 10 minutes.</li>
            <li>Keep that browser open. Save your scene here to update the TV.</li>
          </ol>
          <p>
            Each link works once. That browser stays approved for 90 days; afterwards you can use
            the plain TV address there. For another TV or browser, create a fresh link.
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
            Create TV approval link
          </button>
          {pairing && (
            <div className="admin-actions">
              <input
                readOnly
                aria-label="Private TV approval link"
                value={`${screenUrl}#pair=${pairing.code}`}
                onFocus={(event) => event.target.select()}
              />
              <button className={button} onClick={() => copy(`${screenUrl}#pair=${pairing.code}`)}>
                Copy approval link
              </button>
            </div>
          )}
          <ul className="admin-device-list">
            {data.devices
              .filter(
                (device) => Date.parse(device.expires_at) - Date.parse(device.created_at) > 3600000,
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
  );
}
