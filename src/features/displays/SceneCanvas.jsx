import React, { useEffect, useRef, useState } from 'react';
import { layerStyle } from '../../../supabase/functions/_shared/tv-scenes.js';
import TvMediaPanel from '@/components/tv/TvMediaPanel';
import PrayerWidget from './PrayerWidget';

function VideoContent({ url, stream, muted, title }) {
  const video = useRef(null);
  const [message, setMessage] = useState('');
  const [needsPlay, setNeedsPlay] = useState(false);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let active = true;
    element.srcObject = stream || null;
    setMessage('');
    setNeedsPlay(false);
    element.play().catch(() => {
      if (active) setNeedsPlay(true);
    });
    return () => {
      active = false;
      element.srcObject = null;
    };
  }, [url, stream, muted]);

  return (
    <section className="jic-tv-video" aria-label={title}>
      <video
        ref={video}
        src={stream ? undefined : url}
        autoPlay
        loop={!stream}
        playsInline
        muted={muted}
        onPlaying={() => {
          setNeedsPlay(false);
          setMessage('');
        }}
        onError={() => setMessage('This video cannot play. Check its link and file format.')}
      />
      {message ? (
        <p className="jic-tv-empty" role="status">
          {message}
        </p>
      ) : (
        needsPlay && (
          <button
            type="button"
            className="admin-button"
            onClick={() => {
              video.current
                ?.play()
                .catch(() => setMessage('Playback is blocked. Try muting this video.'));
            }}
          >
            Play video
          </button>
        )
      )}
    </section>
  );
}

export default function SceneCanvas({
  tv,
  screenId,
  now,
  prayers,
  posters,
  slide,
  onImageError,
  livestream,
  localStreams = {},
  preview = false,
}) {
  const scene =
    tv.settings.scenes.find((s) => s.id === tv.settings.active_scene_id) || tv.settings.scenes[0];
  return (
    <main className="scene-player">
      <div className="scene-canvas" aria-label={scene.name}>
        {scene.layers
          .filter((layer) => layer.type !== 'empty')
          .map((layer, index) => (
            <div
              className={`scene-layer scene-source-${layer.type}`}
              key={layer.id}
              style={{ ...layerStyle(layer), zIndex: index + 1 }}
            >
              {layer.type === 'input' && localStreams[layer.slot] ? (
                <VideoContent
                  stream={localStreams[layer.slot]}
                  muted
                  title={layer.name || 'Device preview'}
                />
              ) : layer.type === 'video' ? (
                <VideoContent
                  url={layer.url}
                  muted={tv.settings.muted || !layer.audio}
                  title="Saved video"
                />
              ) : ['times', 'next'].includes(layer.type) ? (
                <PrayerWidget prayers={prayers} now={now} kind={layer.type} />
              ) : layer.type === 'clock' ? (
                <time className="scene-clock" dateTime={now.toISOString()}>
                  {now.toLocaleTimeString('en-GB', {
                    timeZone: 'Europe/London',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </time>
              ) : layer.type === 'text' ? (
                <p className="scene-text" dir="auto">
                  {layer.text}
                </p>
              ) : (
                <TvMediaPanel
                  source={layer.type === 'input' ? 'share' : layer.type}
                  layer={layer}
                  tv={preview && layer.type === 'camera' ? { ...tv, paired: true } : tv}
                  screenId={screenId}
                  now={now}
                  livestream={livestream}
                  poster={
                    ['poster', 'poster-next'].includes(layer.type)
                      ? (() => {
                          const selected = layer.poster_ids
                            ? posters.filter((p) => layer.poster_ids.includes(p.id))
                            : posters;
                          const index = layer.poster_ids
                            ? Math.floor(now.getTime() / ((layer.rotation_seconds || 20) * 1000))
                            : slide + (layer.type === 'poster-next' ? 1 : 0);
                          return selected[index % selected.length];
                        })()
                      : undefined
                  }
                  onImageError={onImageError}
                />
              )}
            </div>
          ))}
        <div className="scene-brand">
          <img src="/brand/jic-pillars-dark.svg" alt="Jamatia Islamic Centre" />
        </div>
      </div>
    </main>
  );
}
