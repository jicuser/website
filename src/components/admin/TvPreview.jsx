import React, { useEffect, useRef, useState } from 'react';
import { publicSettings } from '../../../supabase/functions/_shared/tv.js';

// Normal drafts use the real display renderer, but never publish or send private sources.
export default function TvPreview({ screenId, label, settings }) {
  const box = useRef(null);
  const frame = useRef(null);
  const [scale, setScale] = useState(0);
  const latest = useRef(settings);
  latest.current = settings;
  const send = () =>
    frame.current?.contentWindow?.postMessage(
      {
        type: 'jic-normal-preview',
        screenId,
        settings: publicSettings({ ...latest.current, scene_mode: 'normal', muted: true }),
      },
      window.location.origin,
    );
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 1280));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const ready = (event) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'jic-preview-ready'
      )
        send();
    };
    window.addEventListener('message', ready);
    return () => window.removeEventListener('message', ready);
  }, [screenId]);
  useEffect(() => {
    send();
  }, [settings, screenId]);
  return (
    <div ref={box} className="admin-tv-preview">
      <iframe
        ref={frame}
        title={`${label} Normal draft preview`}
        src={`/tv179/${screenId}?preview=normal`}
        onLoad={send}
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
