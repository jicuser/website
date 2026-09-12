import React, { useId, useRef, useState } from 'react';
import { Copy, Monitor, Pencil, X } from 'lucide-react';
import { nameProblem } from '../../../supabase/functions/_shared/tv-scenes.js';
import { tvRequest } from '@/lib/tvControl';

export default function TvConnections({ screenId, data, setData, onRefresh, run, busy }) {
  const fieldId = useId();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [codeError, setCodeError] = useState('');
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [displayError, setDisplayError] = useState('');
  const displayField = useRef(null);
  const [nameError, setNameError] = useState(false);
  const [showWatchingLink, setShowWatchingLink] = useState(false);
  const codeField = useRef(null);
  const nameField = useRef(null);
  const presentation = data.presentation;
  const devices = data.devices || [];
  const watchingLink = presentation
    ? `${window.location.origin}/tv179/${screenId}#watch=${presentation.code}&session=${presentation.id}`
    : '';

  async function copyWatchingLink() {
    try {
      await navigator.clipboard.writeText(watchingLink);
      setMessage(
        'Watching link copied. Anyone with this link can watch this stream until it ends.',
      );
      setShowWatchingLink(false);
    } catch {
      setShowWatchingLink(true);
      setMessage('Copy the watching link below.');
    }
  }

  function connectDisplay(event) {
    event.preventDefault();
    setMessage('');
    if (!/^\d{6}$/.test(code)) {
      setCodeError('Enter the six-digit code shown in the corner of the display webpage.');
      codeField.current?.focus();
      return;
    }
    setCodeError('');
    const problem = nameProblem(displayName, 'display name');
    setDisplayError(problem);
    if (problem) {
      displayField.current?.focus();
      return;
    }
    run(async () => {
      let connected;
      try {
        connected = await tvRequest(
          'approve-display',
          screenId,
          { code, name: displayName.trim() || undefined },
          { staff: true },
        );
      } catch (error) {
        if (/code|expired|display/i.test(error.message)) {
          setCodeError(error.message);
          codeField.current?.focus();
        }
        throw error;
      }
      setCode('');
      setDisplayName('');
      setMessage(`${connected.name || 'Display'} connected to this stream.`);
      onRefresh().catch(() =>
        setMessage('Display connected. The device list will refresh shortly.'),
      );
    });
  }

  return (
    <section className="admin-panel admin-session-panel" aria-label="Stream displays and viewers">
      <h3>Connect a display</h3>
      {presentation ? (
        <>
          <p>
            Open this hall’s display webpage on the device that will show the stream. Enter the
            six-digit code from its corner here. The code refreshes every 10 minutes.
          </p>
          <form className="admin-connection-form" noValidate onSubmit={connectDisplay}>
            <label htmlFor={`${fieldId}-code`}>
              Display code (required)
              <input
                id={`${fieldId}-code`}
                ref={codeField}
                value={code}
                inputMode="numeric"
                autoComplete="off"
                pattern="[0-9]{6}"
                placeholder="e.g. 123456"
                required
                disabled={busy}
                aria-invalid={Boolean(codeError)}
                aria-describedby={codeError ? `${fieldId}-code-error` : undefined}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setCodeError('');
                }}
              />
              {codeError && (
                <small id={`${fieldId}-code-error`} className="admin-field-error" role="alert">
                  {codeError}
                </small>
              )}
            </label>
            <label htmlFor={`${fieldId}-name`}>
              Display name (required)
              <input
                id={`${fieldId}-name`}
                ref={displayField}
                aria-invalid={Boolean(displayError)}
                aria-describedby={displayError ? `${fieldId}-display-error` : undefined}
                value={displayName}
                maxLength={60}
                placeholder="e.g. Main hall projector"
                disabled={busy}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  setDisplayError('');
                }}
              />
            </label>
            {displayError && (
              <small id={`${fieldId}-display-error`} className="admin-field-error" role="alert">
                {displayError}
              </small>
            )}
            <div className="admin-actions">
              <button type="submit" className="admin-button" disabled={busy}>
                <Monitor size={18} aria-hidden="true" /> Connect display
              </button>
            </div>
          </form>
          <h4>Invite someone to watch</h4>
          <p>Share a watching link for this stream. It stops working when the stream ends.</p>
          <div className="admin-actions">
            <button type="button" className="admin-button" onClick={copyWatchingLink}>
              <Copy size={18} aria-hidden="true" /> Copy watching link
            </button>
          </div>
          {showWatchingLink && (
            <label>
              Watching link
              <input readOnly value={watchingLink} onFocus={(event) => event.target.select()} />
            </label>
          )}
        </>
      ) : (
        <p>
          Start the stream when your scenes are ready. Then connect displays or copy a watching link
          here.
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {presentation && (
        <>
          <h4>Connected displays · {devices.length}</h4>
          {!devices.length && <p>No displays or viewers have joined this stream yet.</p>}
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
            if (nameProblem(editing.name, 'display name')) {
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
              aria-describedby={nameError ? `${fieldId}-rename-error` : undefined}
              onChange={(event) => {
                setEditing({ ...editing, name: event.target.value });
                setNameError(false);
              }}
            />
            {nameError && (
              <small id={`${fieldId}-rename-error`} className="admin-field-error" role="alert">
                {nameProblem(editing.name, 'display name')}
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
