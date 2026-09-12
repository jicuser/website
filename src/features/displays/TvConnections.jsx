import React, { useRef, useState } from 'react';
import { Copy, Monitor, Pencil, X } from 'lucide-react';
import { tvRequest } from '@/lib/tvControl';

export default function TvConnections({ screenId, data, setData, run, busy }) {
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState(false);
  const nameField = useRef(null);
  const presentation = data.presentation;
  const devices = data.devices || [];

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(presentation.code);
      setMessage('Session code copied. Give it to people who may watch this presentation.');
    } catch {
      setMessage('Select the code below and copy it.');
    }
  }

  return (
    <section className="admin-panel admin-session-panel" aria-label="Presentation viewers">
      <h3>Watch this hall stream</h3>
      {presentation ? (
        <>
          <p>Open the display webpage, choose Connect display and enter this session code.</p>
          <div className="admin-actions">
            <output className="admin-session-code" aria-label="Current session code">
              {presentation.code}
            </output>
            <button type="button" className="admin-button" onClick={copyCode}>
              <Copy size={18} aria-hidden="true" /> Copy session code
            </button>
          </div>
          <p>
            The code stays the same when you save or change scenes. Return to Normal ends access; a
            new presentation gets a new code. Viewers can watch without a staff account.
          </p>
        </>
      ) : (
        <p>Normal is public. Press Present with a scene ready to get a session code for viewers.</p>
      )}
      {message && <p role="status">{message}</p>}
      {presentation && (
        <>
          <h4>Connected displays · {devices.length}</h4>
          {!devices.length && <p>No viewers have joined this session yet.</p>}
          <ul className="admin-device-list">
            {devices.map((device) => {
              const online = Date.now() - Date.parse(device.last_seen_at) < 45000;
              const current = Date.parse(device.applied_revision) === Date.parse(data.updated_at);
              return (
                <li key={device.id}>
                  <Monitor size={20} aria-hidden="true" />
                  <span>
                    {device.name || 'Viewing display'}
                    <small className="block">
                      {online
                        ? current
                          ? 'Online · latest layout received'
                          : 'Online · waiting for latest layout'
                        : 'Disconnected · webpage not seen recently'}
                    </small>
                  </span>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-button"
                      disabled={busy}
                      onClick={() => {
                        setNameError(false);
                        setEditing({ id: device.id, name: device.name || '' });
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" /> Rename
                    </button>
                    <button
                      type="button"
                      className="admin-button"
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
                      <X size={16} aria-hidden="true" /> Disconnect
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <small>
            Layout received confirms the webpage updated. Check the picture on the receiving
            display.
          </small>
        </>
      )}
      {editing && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing.name.trim()) {
              setNameError(true);
              nameField.current?.focus();
              return;
            }
            run(async () => {
              await tvRequest(
                'rename-device',
                screenId,
                { deviceId: editing.id, name: editing.name.trim() },
                { staff: true },
              );
              setData((previous) => ({
                ...previous,
                devices: previous.devices.map((item) =>
                  item.id === editing.id ? { ...item, name: editing.name.trim() } : item,
                ),
              }));
              setEditing(null);
            });
          }}
        >
          <label>
            Display name (required)
            <input
              ref={nameField}
              value={editing.name}
              required
              maxLength={60}
              disabled={busy}
              aria-invalid={nameError}
              aria-describedby="display-rename-error"
              onChange={(event) => {
                setEditing({ ...editing, name: event.target.value });
                setNameError(false);
              }}
            />
            {nameError && (
              <small id="display-rename-error" className="admin-field-error" role="alert">
                Enter a name for this display.
              </small>
            )}
          </label>
          <div className="admin-actions">
            <button className="admin-button" disabled={busy}>
              Save name
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
