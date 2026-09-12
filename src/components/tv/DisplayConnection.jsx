import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MonitorUp, X } from 'lucide-react';
import { tvRequest } from '@/lib/tvControl';
import { validateSessionJoin } from '@/hooks/tvScreenConnection';

const nameKey = 'jic-display-name';
function rememberedName() {
  try {
    return localStorage.getItem(nameKey) || '';
  } catch {
    return '';
  }
}

export default function DisplayConnection({ screenId, tv, openRequest = 0 }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [name, setName] = useState(rememberedName);
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const controls = useRef(null);
  const trigger = useRef(null);
  const nameField = useRef(null);
  const codeField = useRef(null);
  const closeButton = useRef(null);
  const request = useRef(null);
  const idleTimer = useRef(null);
  const successTimer = useRef(null);
  const presentation = tv.displayMode === 'teaching';

  const close = useCallback(() => {
    request.current?.abort();
    clearTimeout(successTimer.current);
    setBusy(false);
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (!open && !controls.current?.contains(document.activeElement)) setVisible(false);
      }, 10000);
    };
    show();
    window.addEventListener('pointermove', show, { passive: true });
    window.addEventListener('pointerdown', show, { passive: true });
    window.addEventListener('keydown', show);
    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('pointerdown', show);
      window.removeEventListener('keydown', show);
    };
  }, [open]);

  useEffect(() => {
    if (openRequest) setOpen(true);
  }, [openRequest]);

  useEffect(() => {
    if (!open) return;
    const field = presentation && !tv.paired ? (name.trim() ? codeField : nameField) : closeButton;
    field.current?.focus();
    const escape = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open, presentation, tv.paired, close]);

  useEffect(() => {
    setCode('');
    setErrors({});
    setMessage('');
    setJoined(false);
  }, [tv.presentationId]);

  useEffect(
    () => () => {
      request.current?.abort();
      clearTimeout(successTimer.current);
    },
    [],
  );

  async function join(event) {
    event.preventDefault();
    if (busy) return;
    const nextErrors = validateSessionJoin(name, code);
    setErrors(nextErrors);
    setMessage('');
    if (Object.keys(nextErrors).length) {
      (nextErrors.name ? nameField : codeField).current?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const result = await tvRequest(
        'join-session',
        screenId,
        { name: name.trim(), code },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      try {
        localStorage.setItem(nameKey, name.trim());
      } catch {
        // The name and connection remain usable in this open page.
      }
      tv.connect(result);
      setCode('');
      setJoined(true);
      successTimer.current = setTimeout(close, 1200);
    } catch (error) {
      if (controller.signal.aborted) return;
      if ([400, 401, 403, 404, 410].includes(error.status)) {
        setErrors({ code: error.message });
        codeField.current?.focus();
      } else {
        setMessage(error.message || 'Unable to join. Please try again.');
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  if (screenId === 'shoe-area') return null;
  return (
    <aside
      ref={controls}
      className={`display-connection ${visible || open ? '' : 'is-idle'}`}
      aria-label="Display connection"
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {open && (
        <section
          className="display-connection-panel"
          role="dialog"
          aria-labelledby="display-connection-title"
        >
          <header>
            <h2 id="display-connection-title">
              {presentation ? 'Join presentation' : 'Display connection'}
            </h2>
            <button
              ref={closeButton}
              type="button"
              className="display-connection-close"
              aria-label="Close connection panel"
              onClick={close}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </header>
          {joined ? (
            <p role="status">Session joined. Opening the presentation…</p>
          ) : tv.status !== 'ready' ? (
            <>
              <p role="status">Checking this hall stream…</p>
              <button type="button" onClick={tv.refresh}>
                Retry connection
              </button>
            </>
          ) : !presentation ? (
            <p>
              Normal mode is open to everyone. Keep this webpage open; it updates when the organiser
              presents. A session code is only needed for a presentation.
            </p>
          ) : tv.paired ? (
            <>
              <p>This display has joined the current presentation.</p>
              <p className="display-connection-note">
                You can refresh this webpage without entering the code again. A new session needs a
                new code.
              </p>
            </>
          ) : (
            <form onSubmit={join} noValidate>
              <p>Ask your teacher or organiser for the current session code.</p>
              <label htmlFor="display-connection-name">
                Display name <span>(required)</span>
              </label>
              <input
                ref={nameField}
                id="display-connection-name"
                value={name}
                maxLength={60}
                autoComplete="off"
                placeholder="e.g. Classroom laptop"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'display-name-error' : 'display-name-help'}
                onChange={(event) => {
                  setName(event.target.value);
                  setErrors((previous) => ({ ...previous, name: '' }));
                }}
              />
              {errors.name ? (
                <p id="display-name-error" className="display-field-error">
                  {errors.name}
                </p>
              ) : (
                <small id="display-name-help">
                  Remembered on this browser, so you only need to name it once.
                </small>
              )}
              <label htmlFor="display-connection-code">
                Session code <span>(required)</span>
              </label>
              <input
                ref={codeField}
                id="display-connection-code"
                className="display-code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={8}
                placeholder="8-digit code"
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'display-code-error' : undefined}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 8));
                  setErrors((previous) => ({ ...previous, code: '' }));
                }}
              />
              {errors.code && (
                <p id="display-code-error" className="display-field-error">
                  {errors.code}
                </p>
              )}
              {message && (
                <p role="alert" className="display-field-error">
                  {message}
                </p>
              )}
              <button type="submit" className="display-connection-submit" disabled={busy}>
                {busy ? 'Joining…' : 'Join presentation'}
              </button>
            </form>
          )}
        </section>
      )}
      <button
        ref={trigger}
        type="button"
        className="display-connection-trigger"
        aria-label="Connect display"
        title="Connect display"
        aria-expanded={open}
        onFocus={() => setVisible(true)}
        onClick={() => setOpen((value) => !value)}
      >
        <MonitorUp size={23} aria-hidden="true" />
      </button>
    </aside>
  );
}
