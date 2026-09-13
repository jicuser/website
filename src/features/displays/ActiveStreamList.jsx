import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';

const halls = TV_SCREENS.filter((screen) => screen.id !== 'shoe-area');

// Discovery is read-only. Logging in must not restart or replace another stream.
export default function ActiveStreamList({ onOpen }) {
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
      // Retain only display labels, never the response's viewing credentials.
      setStreams(
        results.flatMap((result, index) =>
          result.status === 'fulfilled' && result.value.presentation
            ? [{ ...halls[index], hasSource: Boolean(result.value.inputs?.length) }]
            : [],
        ),
      );
      setError(
        results.some((result) => result.status === 'rejected')
          ? 'Some halls could not be checked. Retry, or open the hall below to check its stream.'
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

  if (!loading && !error && !streams.length) return null;
  return (
    <section className="admin-panel stream-live-status" aria-label="Unfinished streams">
      <h3>Active streams{streams.length > 0 ? ` · ${streams.length}` : ''}</h3>
      {loading && <p role="status">Checking existing stream sessions…</p>}
      {error && (
        <div role="status">
          <p>{error}</p>
          <button className="admin-button" onClick={() => setRevision((value) => value + 1)}>
            Retry stream check
          </button>
        </div>
      )}
      <div className="admin-actions">
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
            <Radio size={18} aria-hidden="true" /> {stream.label} · active
          </button>
        ))}
      </div>
    </section>
  );
}
