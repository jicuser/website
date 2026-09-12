import React, { useCallback, useEffect, useState } from 'react';
import PrivateTvPlayer from './PrivateTvPlayer';
import YouTubeScreenPlayer from './YouTubeScreenPlayer';
import { youtubeVideoId } from '@/lib/video';

// Each source fails independently, keeping the other panels visible.
export default function TvMediaPanel({
  source,
  layer = {},
  tv,
  screenId,
  poster,
  onImageError,
  livestream,
  now,
}) {
  const [failed, setFailed] = useState(false);
  const unavailable = useCallback(() => setFailed(true), []);
  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => setFailed(false), 30000);
    return () => clearTimeout(timer);
  }, [failed]);
  const scheduled = livestream?.scheduled_at ? Date.parse(livestream.scheduled_at) : null;
  const videoId =
    source === 'youtube'
      ? youtubeVideoId(layer.url)
      : source === 'schedule' && livestream?.enabled && (!scheduled || scheduled <= now.getTime())
        ? youtubeVideoId(livestream.stream_url)
        : '';
  const privateReady =
    tv.paired &&
    screenId !== 'shoe-area' &&
    ((source === 'camera' && layer.url) ||
      (source === 'share' && tv.inputs?.find((input) => input.slot === layer.slot)?.id));
  if (!failed && privateReady)
    return (
      <section
        className="jic-tv-video"
        aria-label={source === 'share' ? 'Lesson screen' : 'Live camera'}
      >
        <PrivateTvPlayer
          screenId={screenId}
          deviceToken={tv.deviceToken}
          sessionId={
            source === 'share'
              ? tv.inputs?.find((input) => input.slot === layer.slot)?.id
              : undefined
          }
          url={source === 'camera' ? layer.url : undefined}
          protocol={layer.protocol}
          muted={tv.settings.muted || !layer.audio}
          onUnavailable={unavailable}
        />
      </section>
    );
  if (!failed && videoId)
    return (
      <section className="jic-tv-video" aria-label="Live video">
        <YouTubeScreenPlayer
          videoId={videoId}
          title={tv.settings.event_title || tv.label}
          muted={tv.settings.muted || !layer.audio}
          onUnavailable={unavailable}
        />
      </section>
    );
  return poster ? (
    <figure className="jic-tv-poster">
      <img src={poster.image} alt={poster.alt} onError={() => onImageError(poster.image)} />
      <figcaption>{poster.title}</figcaption>
    </figure>
  ) : (
    <p className="jic-tv-empty">Community notices</p>
  );
}
