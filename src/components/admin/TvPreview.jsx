import React, { useEffect, useRef, useState } from 'react';
import { tvRequest } from '@/lib/tvControl';

// Use the real TV route at 1280×720. Preview credentials expire and are never stored.
export default function TvPreview({ screenId, label }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1280));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    let deviceId;
    const revoke = () =>
      deviceId && tvRequest('revoke', screenId, { deviceId }, { staff: true }).catch(() => {});
    async function open() {
      try {
        if (screenId === 'shoe-area') {
          setUrl(`/tv179/${screenId}`);
          return;
        }
        const preview = await tvRequest('preview', screenId, {}, { staff: true });
        deviceId = preview.deviceId;
        if (!active) {
          revoke();
          return;
        }
        setUrl(`/tv179/${screenId}#preview=${preview.deviceToken}`);
      } catch (failure) {
        if (active) setError(failure.message);
      }
    }
    open();
    return () => {
      active = false;
      revoke();
    };
  }, [screenId]);
  return (
    <section className="admin-tv-preview-panel">
      <div ref={box} className="admin-tv-preview">
        {url && scale > 0 ? (
          <iframe
            title={`${label} landscape preview`}
            src={url}
            style={{ transform: `scale(${scale})` }}
            allow="autoplay"
          />
        ) : (
          <p role="status">{error || 'Opening TV preview…'}</p>
        )}
      </div>
      <p>
        Landscape · saved display. Preview lasts 10 minutes. Local cameras need this device on the
        mosque network. This preview does not confirm playback on the physical TV.
      </p>
    </section>
  );
}
