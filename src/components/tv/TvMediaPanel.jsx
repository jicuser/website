import React, { useCallback, useEffect, useState } from 'react';
import PrivateTvPlayer from './PrivateTvPlayer';
import YouTubeScreenPlayer from './YouTubeScreenPlayer';
import AnnouncementPoster from '@/components/posters/AnnouncementPoster';
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
  const [failed, setFailed] = useState('');
  const unavailable = useCallback(
    (reason) =>
      setFailed(
        typeof reason === 'string' ? reason : 'Video is temporarily unavailable. Retrying…',
      ),
    [],
  );
  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => setFailed(''), 10000);
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
    tv?.paired &&
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
  if (poster?.kind === 'announcement') return <AnnouncementPoster poster={poster} />;
  return poster ? (
    <figure className="jic-tv-poster">
      <img src={poster.image} alt={poster.alt} onError={() => onImageError(poster.image)} />
      <figcaption>{poster.title}</figcaption>
    </figure>
  ) : (
    <div className="jic-tv-empty" role="status">
      {failed ||
        (source === 'share'
          ? 'Waiting for the shared screen or camera…'
          : 'Waiting for selected content…')}
    </div>
  );
}
