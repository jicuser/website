import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useTvScreen from '@/hooks/useTvScreen';
import TvPosterRail from '@/components/tv/TvPosterRail';
import SceneCanvas from '@/features/displays/SceneCanvas';
import TvPrayerScene from '@/components/tv/TvPrayerScene';
import TvSpecialNotice from '@/components/tv/TvSpecialNotice';
import DisplayConnection from '@/components/tv/DisplayConnection';
import {
  tvPrayerSequence,
  tvSpecialNotice,
  automaticTvNotice,
  fastingTimes,
} from '@/lib/tvPrayerSequence';
import { TV_SCREENS } from '@/lib/tvControl';
import { tvScene, publicSettings } from '../../supabase/functions/_shared/tv.js';
import { Helmet } from 'react-helmet';
import PrayerTimeBar, { NextPrayerSummary } from '@/components/shell/PrayerTimeBar';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';
import { useContent } from '@/context/ContentContext';
import { safeWebUrl } from '@/lib/video';
import { londonDate } from '@/lib/timetable';

export default function TvDisplayPage() {
  const { screenId = 'mens-main' } = useParams();
  if (!TV_SCREENS.some((item) => item.id === screenId))
    return (
      <main className="p-8">
        Unknown hall stream. <a href="/tv179">Open Men’s Main Hall</a>
      </main>
    );
  return <ScreenDisplay key={screenId} screenId={screenId} />;
}

function ScreenDisplay({ screenId }) {
  const programmes = usePosters();
  const { refreshContent } = useContent();
  useEffect(() => {
    const timer = setInterval(() => refreshContent().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [refreshContent]);
  const normalPreview =
    window.parent !== window &&
    new URLSearchParams(window.location.search).get('preview') === 'normal';
  const connection = useTvScreen(screenId, { normalPreview });
  const [draft, setDraft] = useState({});
  useEffect(() => {
    if (!normalPreview) return;
    const receive = (event) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== 'jic-normal-preview' ||
        event.data.screenId !== screenId
      )
        return;
      if (event.data.settings && typeof event.data.settings === 'object')
        setDraft(event.data.settings);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'jic-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, [normalPreview, screenId]);
  const tv = normalPreview
    ? {
        ...connection,
        settings: publicSettings({ ...draft, scene_mode: 'normal', muted: true }),
        displayMode: 'normal',
        inputs: [],
        error: '',
        status: 'ready',
      }
    : connection;
  const screen = useRef(null);
  const prayers = usePrayerTimes({ includeTomorrow: true });
  const { events, livestream, stale } = useHomeLiveContent({ eventLimit: 50 });
  const [now, setNow] = useState(() => new Date());
  const [slide, setSlide] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  const today = londonDate();
  const sequence = tvPrayerSequence(
    now,
    prayers.todaysTimes,
    prayers.jummahTimes,
    tv.settings,
    screenId,
  );
  const scene = tvScene(tv.settings, now.getTime());
  const posters = useMemo(() => {
    const programmePosters = programmes.filter(
      (item) => scene === 'teaching' || tv.settings.poster_ids.includes(item.id),
    );
    const eventPosters = events
      .filter(
        (event) =>
          (scene === 'teaching' || tv.settings.include_events) &&
          event.event_date >= today &&
          safeWebUrl(event.poster_url),
      )
      .map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        image: event.poster_url,
        alt: `${event.title} poster`,
      }));
    const seen = new Set();
    return [...programmePosters, ...eventPosters].filter((item) => {
      const key = item.kind === 'announcement' ? item.id : item.image;
      if (seen.has(key) || (item.kind !== 'announcement' && failedImages.includes(item.image)))
        return false;
      seen.add(key);
      return true;
    });
  }, [
    programmes,
    scene,
    events,
    failedImages,
    today,
    tv.settings.poster_ids,
    tv.settings.include_events,
  ]);
  const automaticNotice = automaticTvNotice(
    now,
    prayers.todaysTimes,
    prayers.jummahTimes,
    tv.settings,
    screenId,
  );
  // Fasting notices rotate with posters; Jama‘ah and Taraweeh still take priority.
  const specialNotice =
    scene === 'normal'
      ? tvSpecialNotice(now, tv.settings, screenId) ||
        (automaticNotice === 'fasting' && Math.floor(now.getTime() / 20000) % 3 !== 0
          ? null
          : automaticNotice)
      : null;
  const noticeVisible = Boolean(sequence || specialNotice);
  const onImageError = useCallback(
    (image) =>
      setFailedImages((previous) => (previous.includes(image) ? previous : [...previous, image])),
    [],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scene !== 'teaching' || posters.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((index) => (index + 1) % posters.length),
      tv.settings.rotation_seconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [scene, posters.length, tv.settings.rotation_seconds]);
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
        /* Devices without Wake Lock use their own screen timeout setting. */
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

  const enterFullscreen = async () => {
    try {
      await screen.current?.requestFullscreen?.();
      await window.screen.orientation?.lock?.('landscape');
    } catch {
      /* The device keeps its orientation when browser locking is unavailable. */
    }
  };

  const connectionControl = !normalPreview && <DisplayConnection screenId={screenId} tv={tv} />;

  if (!tv.displayMode || (tv.displayMode === 'teaching' && (!tv.paired || scene !== 'teaching')))
    return (
      <div ref={screen} className="jic-tv-shell jic-tv-teaching" onDoubleClick={enterFullscreen}>
        <Helmet>
          <title>JIC · {tv.label}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <main className="tv-class-waiting" aria-live="polite">
          <h1>{tv.label}</h1>
          {tv.status === 'loading' ? (
            <p>Loading hall stream…</p>
          ) : tv.status === 'error' ? (
            <>
              <p>Reconnecting to the hall stream…</p>
              <p className="display-connection-note">{tv.error}</p>
              <button type="button" onClick={tv.refresh}>
                Retry connection
              </button>
            </>
          ) : !tv.paired ? (
            <>
              <p>Stream ready. Enter this display’s code in Admin to connect.</p>
            </>
          ) : (
            <>
              <p>Updating the stream…</p>
              <button type="button" onClick={tv.refresh}>
                Retry connection
              </button>
            </>
          )}
        </main>
        {connectionControl}
      </div>
    );

  if (scene === 'teaching')
    return (
      <div ref={screen} className="jic-tv-shell jic-tv-teaching" onDoubleClick={enterFullscreen}>
        <Helmet>
          <title>JIC · {tv.label}</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <SceneCanvas
          tv={tv}
          screenId={screenId}
          now={now}
          prayers={prayers}
          posters={posters}
          slide={slide}
          onImageError={onImageError}
          livestream={livestream}
        />
        {connectionControl}
      </div>
    );

  return (
    <div ref={screen} className="jic-tv-shell" onDoubleClick={enterFullscreen}>
      <Helmet>
        <title>JIC · {tv.label}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="jic-tv-display">
        <header className="jic-tv-header">
          {tv.settings.show_times !== false && (
            <PrayerTimeBar
              {...prayers}
              currentDate={now}
              interactive={false}
              showContact={false}
              showTimes={tv.settings.show_times !== false}
              showNext={false}
            />
          )}
          {(tv.settings.show_times !== false || tv.settings.show_next !== false) &&
            (prayers.error || (!prayers.isLoadingPrayerTimes && !prayers.todaysTimes)) && (
              <p className="jic-tv-notice" role="status">
                Prayer timetable unavailable · reconnecting
              </p>
            )}
        </header>
        <main className="jic-tv-stage" aria-label="Hall display content">
          {sequence && (
            <TvPrayerScene sequence={sequence} jummahNotice={tv.settings.jummah_notice} />
          )}
          {!sequence && specialNotice && (
            <TvSpecialNotice
              mode={specialNotice}
              settings={tv.settings}
              fasting={fastingTimes(now, prayers.todaysTimes, prayers.tomorrowsTimes)}
            />
          )}
          {!noticeVisible && (
            <TvPosterRail
              posters={posters}
              seconds={tv.settings.rotation_seconds}
              onImageError={onImageError}
            />
          )}
        </main>
        <footer className="jic-tv-status">
          {tv.settings.show_next !== false && (
            <div className="jic-tv-next">
              <NextPrayerSummary todaysTimes={prayers.todaysTimes} currentDate={now} />
            </div>
          )}
          <div className="jic-tv-logo">
            <img src="/brand/jic-pillars-dark.svg" alt="Jamatia Islamic Centre" />
          </div>
          {tv.settings.show_clock !== false && (
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
          )}

          <span>{tv.label}</span>
          {tv.error && <span role="status">Display update delayed</span>}
          {stale && <span role="status">Content update delayed · reconnecting</span>}
        </footer>
      </div>
      {connectionControl}
    </div>
  );
}
