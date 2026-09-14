import React, { useEffect, useState } from 'react';
import { MonitorPlay, Radio } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';

const halls = TV_SCREENS.filter((screen) => screen.id !== 'shoe-area');

// Discovery is read-only and comes from the server presentation session. Logging in,
// logging out or opening another browser must never restart or replace another stream.
export default function ActiveStreamList({ onOpen, onStart, compact = false }) {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    setLoading(true);
    async function load() {
      const results = await Promise.allSettled(
        halls.map((hall) =>
          tvRequest(
            'admin',
            hall.id,
            {},
            { staff: true, signal: controller.signal, timeoutMs: 8000 },
          ),
        ),
      );
      if (controller.signal.aborted) return;
      setStreams(
        results.flatMap((result, index) =>
          result.status === 'fulfilled' && result.value.presentation
            ? [{ ...halls[index], hasSource: Boolean(result.value.inputs?.length) }]
            : [],
        ),
      );
      setError(
        results.some((result) => result.status === 'rejected')
          ? 'Some halls could not be checked.'
          : '',
      );
      setLoading(false);
      timer = setTimeout(load, 15000);
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);

  const status = loading
    ? 'Checking…'
    : streams.length
      ? `Live · ${streams.length}`
      : error
        ? 'Check failed'
        : 'Offline';

  if (compact) {
    return (
      <section className="admin-panel stream-live-status" aria-label="Presentation stream status">
        <div className="admin-actions">
          <Radio size={17} aria-hidden="true" />
          <strong>Presentation stream</strong>
          <span className="content-status" role="status">
            {status}
          </span>
          {onStart && !streams.length && !loading && (
            <button className="admin-button primary" type="button" onClick={onStart}>
              <MonitorPlay size={16} aria-hidden="true" /> Quick present
            </button>
          )}
          {streams.map((stream) => (
            <button
              key={stream.id}
              type="button"
              className="admin-button primary"
              aria-label={`Manage or end ${stream.label}`}
              title={
                stream.hasSource
                  ? 'A source is registered. Open to check or end it.'
                  : 'The session is still open. Reconnect a source or end it.'
              }
              onClick={() => onOpen(stream.id)}
            >
              {stream.label} · manage
            </button>
          ))}
          {error && (
            <button className="admin-button" onClick={() => setRevision((value) => value + 1)}>
              Retry
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel stream-live-status" aria-label="Presentation stream status">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">SERVER STATUS</span>
          <h3>Presentation stream · {status}</h3>
          <p>
            This status comes from the active server session, so it remains visible after logout or on
            another admin device.
          </p>
        </div>
      </div>
      {error && (
        <div role="status">
          <p>{error} Retry, or open a hall to check its presentation.</p>
          <button className="admin-button" onClick={() => setRevision((value) => value + 1)}>
            Retry stream check
          </button>
        </div>
      )}
      <div className="admin-actions">
        {onStart && !streams.length && !loading && (
          <button className="admin-button primary" type="button" onClick={onStart}>
            <MonitorPlay size={18} aria-hidden="true" /> Quick present
          </button>
        )}
        {streams.map((stream) => (
          <button
            key={stream.id}
            type="button"
            className="admin-button primary"
            aria-label={`Manage or end ${stream.label}`}
            title={
              stream.hasSource
                ? 'Source registered; open to check or end.'
                : 'Session open; reconnect a source or end.'
            }
            onClick={() => onOpen(stream.id)}
          >
            <Radio size={18} aria-hidden="true" /> {stream.label} · live
          </button>
        ))}
      </div>
    </section>
  );
}
