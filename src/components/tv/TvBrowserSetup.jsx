import React, { useCallback, useEffect, useState } from 'react';
import { deviceKey, tvRequest } from '@/lib/tvControl';

const setupKey = (id) => `jic-tv-setup-${id}`;
const validToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const newToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');

// The code authorises this browser. Its private credential never leaves local storage
// through a URL, and changing scenes does not require connecting the TV again.
export default function TvBrowserSetup({ screenId, paired, onConnected }) {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (paired) return;
    try {
      const token = localStorage.getItem(setupKey(screenId));
      if (validToken(token)) setPending({ token });
    } catch {
      /* Public posters still work without browser storage. */
    }
  }, [screenId, paired]);

  const connected = useCallback(
    (token) => {
      try {
        localStorage.setItem(deviceKey(screenId), token);
        localStorage.removeItem(setupKey(screenId));
      } catch {
        setMessage(
          'This browser cannot remember its connection. Enable website storage and try again.',
        );
        return;
      }
      setPending(null);
      onConnected();
    },
    [screenId, onConnected],
  );

  useEffect(() => {
    if (!pending?.token || paired) return;
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        const result = await tvRequest(
          'setup-status',
          screenId,
          { setupToken: pending.token },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (result.approved) {
          connected(pending.token);
          return;
        }
        setPending((previous) => previous && { ...previous, ...result });
        setMessage('');
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error.status === 410) {
          setPending(null);
          try {
            localStorage.removeItem(setupKey(screenId));
          } catch {
            /* No stored request. */
          }
          setMessage('Setup code expired. Choose Connect TV to try again.');
          return;
        }
        setMessage('Connection interrupted. Retrying…');
      }
      timer = setTimeout(poll, 3000);
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [screenId, pending?.token, paired, connected]);

  async function begin() {
    setBusy(true);
    setMessage('');
    try {
      // Persist before requesting, so a reload can resume the same setup request.
      let token = localStorage.getItem(setupKey(screenId));
      if (!validToken(token)) token = newToken();
      localStorage.setItem(setupKey(screenId), token);
      const result = await tvRequest('begin-setup', screenId, { setupToken: token });
      if (result.approved) connected(token);
      else setPending({ token, ...result });
    } catch (error) {
      setMessage(error.message || 'Unable to connect this browser.');
    } finally {
      setBusy(false);
    }
  }
  if (paired || screenId === 'shoe-area') return null;
  return (
    <aside
      className={`tv-browser-setup ${pending ? 'is-pending' : ''}`}
      aria-label="TV connection"
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {pending ? (
        <>
          <strong>Connect this TV</strong>
          <p>In Admin, choose this hall and enter this code.</p>
          <output className="tv-setup-code" aria-label="TV setup code">
            {pending.code || '…'}
          </output>
          <small>Code lasts 10 minutes. Keep this page open.</small>
        </>
      ) : (
        <button type="button" onClick={begin} disabled={busy}>
          {busy ? 'Connecting…' : 'Connect TV'}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
