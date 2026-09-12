import React, { useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
const button = 'admin-button';
export default function TvConnections({ screenId, data, setData, form, update, run, busy, copy }) {
  const hall = screenId !== 'shoe-area';
  const screenUrl = `${window.location.origin}/tv179/${screenId}`;
  const [pairing, setPairing] = useState(null);
  return (
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
            For private video, open the approval link once in the TV’s browser. It approves this
            browser for 90 days; there is no Bluetooth connection or app to install. The link works
            once and expires in 10 minutes.
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
              <button className={button} onClick={() => copy(`${screenUrl}#pair=${pairing.code}`)}>
                Copy link
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
