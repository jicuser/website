import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import YouTubeScreenPlayer from '@/components/tv/YouTubeScreenPlayer';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { PROGRAMMES } from '@/content/programmes';
import { safeWebUrl, youtubeVideoId } from '@/lib/video';
import { londonDate } from '@/lib/timetable';

const ROTATE_MS = 20000;

export default function TvDisplayPage() {
  const screen = useRef(null);
  const prayers = usePrayerTimes();
  const { events, livestream, stale } = useHomeLiveContent({ eventLimit: 50 });
  const [now, setNow] = useState(() => new Date());
  const [slide, setSlide] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [failedVideo, setFailedVideo] = useState('');
  const today = londonDate();
  const posters = useMemo(() => {
    const programmePosters = PROGRAMMES.map((item) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      alt: item.alt,
    }));
    const eventPosters = events
      .filter((event) => event.event_date >= today && safeWebUrl(event.poster_url))
      .map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        image: event.poster_url,
        alt: `${event.title} poster`,
      }));
    const seen = new Set();
    return [...programmePosters, ...eventPosters].filter((item) => {
      if (seen.has(item.image) || failedImages.includes(item.image)) return false;
      seen.add(item.image);
      return true;
    });
  }, [events, failedImages, today]);
  const videoId = youtubeVideoId(livestream?.stream_url);
  const scheduled = livestream?.scheduled_at ? new Date(livestream.scheduled_at).getTime() : null;
  const liveAvailable = Boolean(
    livestream?.enabled && videoId && (!scheduled || scheduled <= now.getTime()),
  );
  const showLive = liveAvailable && failedVideo !== videoId;
  const visiblePosters = posters.length
    ? [
        posters[slide % posters.length],
        ...(posters.length > 1 && !showLive ? [posters[(slide + 1) % posters.length]] : []),
      ]
    : [];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (posters.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((index) => (index + 1) % posters.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [posters.length]);
  useEffect(() => {
    setFailedVideo('');
  }, [videoId, livestream?.enabled]);
  useEffect(() => {
    const fullscreenKey = (event) => {
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        screen.current?.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener('keydown', fullscreenKey);
    return () => window.removeEventListener('keydown', fullscreenKey);
  }, []);
  useEffect(() => {
    let active = true;
    let lock;
    const keepAwake = async () => {
      if (document.visibilityState !== 'visible' || !navigator.wakeLock || lock) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (!active) {
          await next.release();
          return;
        }
        lock = next;
        next.addEventListener('release', () => {
          lock = null;
        });
      } catch {
        /* TVs without Wake Lock use their own screen timeout setting. */
      }
    };
    keepAwake();
    document.addEventListener('visibilitychange', keepAwake);
    document.addEventListener('fullscreenchange', keepAwake);
    return () => {
      active = false;
      lock?.release().catch(() => {});
      document.removeEventListener('visibilitychange', keepAwake);
      document.removeEventListener('fullscreenchange', keepAwake);
    };
  }, []);

  const onUnavailable = useCallback(() => setFailedVideo(videoId), [videoId]);
  const enterFullscreen = () => screen.current?.requestFullscreen?.().catch(() => {});

  return (
    <div ref={screen} className="jic-tv-display" onDoubleClick={enterFullscreen}>
      <Helmet>
        <title>JIC · TV Display</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="jic-tv-header">
        <div className="jic-tv-heading">
          <div className="jic-tv-logo">
            <JamatiaLogo />
          </div>
          <div className="jic-tv-clock">
            <time dateTime={now.toISOString()}>
              {now.toLocaleTimeString('en-GB', {
                timeZone: 'Europe/London',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
            <span>
              {now.toLocaleDateString('en-GB', {
                timeZone: 'Europe/London',
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <PrayerTimeBar {...prayers} currentDate={now} interactive={false} showContact={false} />
        {(prayers.error || (!prayers.isLoadingPrayerTimes && !prayers.todaysTimes)) && (
          <p className="jic-tv-notice" role="status">
            Prayer timetable unavailable · reconnecting
          </p>
        )}
      </header>
      <main
        className={`jic-tv-stage ${showLive ? 'is-live' : ''}`}
        aria-label={showLive ? 'Livestream and posters' : 'Community posters'}
      >
        {showLive && (
          <section className="jic-tv-video">
            <h1>{livestream.title || 'JIC Livestream'}</h1>
            <YouTubeScreenPlayer
              videoId={videoId}
              title={livestream.title}
              muted
              onUnavailable={onUnavailable}
            />
          </section>
        )}
        <div className="jic-tv-posters">
          {visiblePosters.map((item) => (
            <figure key={item.id} className="jic-tv-poster">
              <img
                src={item.image}
                alt={item.alt}
                onError={() =>
                  setFailedImages((previous) =>
                    previous.includes(item.image) ? previous : [...previous, item.image],
                  )
                }
              />
              <figcaption>{item.title}</figcaption>
            </figure>
          ))}
        </div>
        {!posters.length && !showLive && (
          <p className="jic-tv-empty">Posters will appear here when available.</p>
        )}
      </main>
      <div className="jic-tv-status">
        {stale ? (
          'Content update delayed · reconnecting'
        ) : (
          <span>
            {showLive ? 'Livestream' : 'Community notices'}
            {posters.length > 1 && ` · ${(slide % posters.length) + 1} / ${posters.length}`}
          </span>
        )}
      </div>
    </div>
  );
}
