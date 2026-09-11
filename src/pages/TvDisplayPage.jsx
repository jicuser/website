import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useTvScreen from '@/hooks/useTvScreen';
import PrivateTvPlayer from '@/components/tv/PrivateTvPlayer';
import { TV_SCREENS } from '@/lib/tvControl';
import { Helmet } from 'react-helmet';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
import YouTubeScreenPlayer from '@/components/tv/YouTubeScreenPlayer';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import { PROGRAMMES } from '@/content/programmes';
import { safeWebUrl, youtubeVideoId } from '@/lib/video';
import { londonDate } from '@/lib/timetable';

export default function TvDisplayPage() {
  const { screenId = 'mens-main' } = useParams();
  if (!TV_SCREENS.some((item) => item.id === screenId))
    return (
      <main className="p-8">
        Unknown TV screen. <a href="/tv179">Open Men’s Main Hall</a>
      </main>
    );
  return <ScreenDisplay key={screenId} screenId={screenId} />;
}

function ScreenDisplay({ screenId }) {
  const tv = useTvScreen(screenId);
  const [pairOpen, setPairOpen] = useState(false);
  const [pairCode, setPairCode] = useState('');
  const pairDialog = useRef(null);
  useEffect(() => {
    if (pairOpen) pairDialog.current?.showModal();
  }, [pairOpen]);
  const [privateFailed, setPrivateFailed] = useState(false);
  const privateSource =
    tv.session?.id || (tv.settings.mode === 'camera' ? tv.settings.camera_url : '');
  const showPrivate = tv.paired && privateSource && !privateFailed;
  const privateUnavailable = useCallback(() => setPrivateFailed(true), []);
  useEffect(() => {
    setPrivateFailed(false);
  }, [privateSource]);
  useEffect(() => {
    if (!privateFailed) return;
    const timer = setTimeout(() => setPrivateFailed(false), 30000);
    return () => clearTimeout(timer);
  }, [privateFailed]);
  const screen = useRef(null);
  const prayers = usePrayerTimes();
  const { events, livestream, stale } = useHomeLiveContent({ eventLimit: 50 });
  const [now, setNow] = useState(() => new Date());
  const [slide, setSlide] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const [failedVideo, setFailedVideo] = useState('');
  const today = londonDate();
  const posters = useMemo(() => {
    const programmePosters = PROGRAMMES.filter((item) =>
      tv.settings.poster_ids.includes(item.id),
    ).map((item) => ({
      id: item.id,
      title: item.title,
      image: item.image,
      alt: item.alt,
    }));
    const eventPosters = events
      .filter(
        (event) =>
          tv.settings.include_events && event.event_date >= today && safeWebUrl(event.poster_url),
      )
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
  }, [events, failedImages, today, tv.settings.poster_ids, tv.settings.include_events]);
  const videoId = youtubeVideoId(
    tv.settings.mode === 'youtube' ? tv.settings.youtube_url : livestream?.stream_url,
  );
  const scheduled = livestream?.scheduled_at ? new Date(livestream.scheduled_at).getTime() : null;
  const liveAvailable = Boolean(
    videoId &&
    (tv.settings.mode === 'youtube' ||
      (tv.settings.mode === 'schedule' &&
        livestream?.enabled &&
        (!scheduled || scheduled <= now.getTime()))),
  );
  const showYoutube = !showPrivate && liveAvailable && failedVideo !== videoId;
  const showLive = showPrivate || showYoutube;
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
      tv.settings.rotation_seconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [posters.length, tv.settings.rotation_seconds]);
  useEffect(() => {
    setFailedVideo('');
  }, [videoId, livestream?.enabled]);
  useEffect(() => {
    const fullscreenKey = (event) => {
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
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
        <title>JIC · {tv.label}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="jic-tv-header">
        <div className="jic-tv-heading">
          <div className="jic-tv-logo">
            <JamatiaLogo variant="wordmark" />
          </div>
          <div className="jic-tv-clock">
            <time dateTime={now.toISOString()}>
              {now.toLocaleTimeString('en-GB', {
                timeZone: 'Europe/London',
                hour: 'numeric',
                minute: '2-digit',
                hourCycle: 'h12',
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
        {showPrivate && (
          <section className="jic-tv-video">
            <h1>
              {tv.label} · {tv.session?.kind === 'screen' ? 'Shared screen' : 'Live camera'}
            </h1>
            <PrivateTvPlayer
              screenId={screenId}
              deviceToken={tv.deviceToken}
              sessionId={tv.session?.id}
              url={tv.settings.camera_url}
              protocol={tv.settings.camera_protocol}
              muted={tv.settings.muted}
              onUnavailable={privateUnavailable}
            />
          </section>
        )}
        {showYoutube && (
          <section className="jic-tv-video">
            <h1>
              {tv.settings.mode === 'youtube' ? tv.label : livestream?.title || 'JIC Livestream'}
            </h1>
            <YouTubeScreenPlayer
              videoId={videoId}
              title={tv.settings.mode === 'youtube' ? tv.label : livestream?.title}
              muted={tv.settings.muted}
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
        <span>{tv.label}</span>
        {tv.error && <span role="status">{tv.error}</span>}
        {privateFailed && <span role="status">Live feed unavailable · retrying</span>}
        {stale ? (
          'Content update delayed · reconnecting'
        ) : (
          <span>
            {showLive ? 'Livestream' : 'Community notices'}
            {posters.length > 1 && ` · ${(slide % posters.length) + 1} / ${posters.length}`}
          </span>
        )}
        {!tv.paired && (
          <button className="jic-tv-pair-button" onClick={() => setPairOpen(true)}>
            Pair TV
          </button>
        )}
      </div>
      {pairOpen && (
        <dialog
          ref={pairDialog}
          onCancel={() => setPairOpen(false)}
          className="jic-tv-pairing"
          aria-labelledby="tv-pair-title"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              window.location.hash = `pair=${pairCode.trim()}`;
              setPairOpen(false);
              tv.refresh();
            }}
          >
            <h2 id="tv-pair-title">Pair {tv.label}</h2>
            <label>
              Paste the code from Admin → {tv.label}
              <input
                autoFocus
                value={pairCode}
                onChange={(event) => setPairCode(event.target.value)}
                required
                pattern="[a-f0-9]{64}"
                autoComplete="off"
              />
            </label>
            <button type="submit">Pair TV</button>
            <button type="button" onClick={() => setPairOpen(false)}>
              Cancel
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
