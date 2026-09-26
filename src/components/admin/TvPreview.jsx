import React, { useEffect, useRef, useState } from 'react';
import { publicSettings } from '../../../supabase/functions/_shared/tv.js';

// Normal drafts use the real display renderer, but never publish or send private sources.
export default function TvPreview({ screenId, label, settings, previewState = 'standby' }) {
  const box = useRef(null);
  const frame = useRef(null);
  const [scale, setScale] = useState(0);
  const latest = useRef({ settings, previewState });
  latest.current = { settings, previewState };
  const send = () =>
    frame.current?.contentWindow?.postMessage(
      {
        type: 'jic-normal-preview',
        screenId,
        settings: publicSettings({ ...latest.current.settings, scene_mode: 'normal', muted: true }),
        previewState: latest.current.previewState,
      },
      window.location.origin,
    );
  const portrait = settings.display_orientation === 'portrait';
  const baseWidth = portrait ? 720 : 1280;
  const baseHeight = portrait ? 1280 : 720;
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / baseWidth));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, [baseWidth]);
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
  }, [settings, screenId, previewState]);
  return (
    <div ref={box} className={`admin-tv-preview ${portrait ? 'is-portrait' : ''}`}>
      <iframe
        ref={frame}
        title={`${label} ${previewState} draft preview`}
        src={`/tv179/${screenId}?preview=normal`}
        onLoad={send}
        style={{ width: `${baseWidth}px`, height: `${baseHeight}px`, transform: `scale(${scale})` }}
      />
    </div>
  );
}
