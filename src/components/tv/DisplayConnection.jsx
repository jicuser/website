import React, { useEffect, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';
import { displayCodeRemaining, validDeviceToken } from '@/hooks/tvScreenConnection';

export default function DisplayConnection({ screenId, tv }) {
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  const [revision, setRevision] = useState(0);
  const enabled = !tv.preview && screenId !== 'shoe-area' && validDeviceToken(tv.identityToken);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let nextRequest;
    let requesting = false;
    setConnection(null);
    setError('');
    async function updateCode() {
      if (controller.signal.aborted || requesting) return;
      requesting = true;
      clearTimeout(nextRequest);
      let delay = 10000;
      try {
        const result = await tvRequest(
          'display-code',
          screenId,
          { deviceToken: tv.identityToken },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const seconds = displayCodeRemaining(result.expires_at);
        if (!/^\d{6}$/.test(result.code || '') || !seconds)
          throw new Error('The display code could not be refreshed.');
        setConnection({ code: result.code, expiresAt: result.expires_at });
        setNow(Date.now());
        setError('');
        delay = Math.min(60000, seconds * 1000 + 100);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure.message || 'Display code unavailable. Check the connection.');
      } finally {
        requesting = false;
        if (!controller.signal.aborted) nextRequest = setTimeout(updateCode, delay);
      }
    }
    updateCode();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const resume = () => {
      if (document.visibilityState !== 'hidden') updateCode();
    };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      controller.abort();
      clearTimeout(nextRequest);
      clearInterval(clock);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [screenId, tv.identityToken, enabled, revision]);

  if (tv.preview || screenId === 'shoe-area') return null;
  const remaining = displayCodeRemaining(connection?.expiresAt, now);
  const code = remaining && connection ? connection.code : '';
  const countdown = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  return (
    <aside
      className="display-connection"
      aria-label="Display connection code"
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div className="display-code-card">
        <span className="display-code-label">Display code</span>
        <strong
          aria-label={code ? `Display code ${code.split('').join(' ')}` : 'Loading display code'}
        >
          {code ? `${code.slice(0, 3)} ${code.slice(3)}` : '··· ···'}
        </strong>
        <small>{code ? `Refreshes in ${countdown}` : 'Refreshing code…'}</small>
        {tv.paired && <small className="display-code-connected">Connected</small>}
      </div>
      {tv.linkError && (
        <div className="display-code-error" role="status">
          <p>{tv.linkError}</p>
          <button type="button" onClick={tv.refresh}>
            Retry stream link
          </button>
        </div>
      )}
      {error && (
        <div className="display-code-error" role="status">
          <p>{error}</p>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Retry code
          </button>
        </div>
      )}
    </aside>
  );
}
