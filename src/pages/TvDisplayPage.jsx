import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import useTvScreen from '@/hooks/useTvScreen';
import TvMediaPanel from '@/components/tv/TvMediaPanel';
import SceneCanvas from '@/features/displays/SceneCanvas';
import TvPrayerScene from '@/components/tv/TvPrayerScene';
import TvSpecialNotice from '@/components/tv/TvSpecialNotice';
import TvBrowserSetup from '@/components/tv/TvBrowserSetup';
import {
  tvPrayerSequence,
  tvSpecialNotice,
  automaticTvNotice,
  fastingTimes,
} from '@/lib/tvPrayerSequence';
import { TV_REMINDERS } from '@/content/tvReminders';
import { TV_SCREENS } from '@/lib/tvControl';
import { tvScene } from '../../supabase/functions/_shared/tv.js';
import { Helmet } from 'react-helmet';
import PrayerTimeBar from '@/components/shell/PrayerTimeBar';
import JamatiaLogo from '@/components/shell/JamatiaLogo';
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
        Unknown TV screen. <a href="/tv179">Open Men’s Main Hall</a>
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
  const tv = useTvScreen(screenId);
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
    const programmePosters = programmes
      .filter((item) => scene === 'teaching' || tv.settings.poster_ids.includes(item.id))
      .map((item) => ({
        id: item.id,
        title: item.title,
        image: item.image,
        alt: item.alt,
      }));
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
      if (seen.has(item.image) || failedImages.includes(item.image)) return false;
      seen.add(item.image);
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
  const panels = ['poster', 'poster-next'];
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
    if (posters.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((index) => (index + 1) % posters.length),
      tv.settings.rotation_seconds * 1000,
    );
    return () => window.clearInterval(timer);
  }, [posters.length, tv.settings.rotation_seconds]);
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

  const enterFullscreen = async () => {
    try {
      await screen.current?.requestFullscreen?.();
      await window.screen.orientation?.lock?.('landscape');
    } catch {
      /* The TV controls its own orientation when locking is unavailable. */
    }
  };

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
          {(tv.settings.show_times !== false || tv.settings.show_next !== false) && (
            <PrayerTimeBar
              {...prayers}
              currentDate={now}
              interactive={false}
              showContact={false}
              showTimes={tv.settings.show_times !== false}
              showNext={tv.settings.show_next !== false}
            />
          )}
          {(tv.settings.show_times !== false || tv.settings.show_next !== false) &&
            (prayers.error || (!prayers.isLoadingPrayerTimes && !prayers.todaysTimes)) && (
              <p className="jic-tv-notice" role="status">
                Prayer timetable unavailable · reconnecting
              </p>
            )}
        </header>
        <main className="jic-tv-stage" aria-label="TV content">
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
            <>
              <div
                className="tv-panel-layout jic-tv-panels"
                data-layout="columns"
                data-count={panels.length}
                style={{
                  '--panel-count': panels.length,
                  '--panel-rows': Math.ceil(panels.length / 2),
                }}
              >
                {panels.map((source, index) => (
                  <TvMediaPanel
                    key={source}
                    source={source}
                    screenId={screenId}
                    tv={tv}
                    now={now}
                    livestream={livestream}
                    poster={
                      posters[
                        (slide + (source === 'poster-next' ? 1 : source === 'poster' ? 0 : index)) %
                          posters.length
                      ]
                    }
                    onImageError={onImageError}
                  />
                ))}
              </div>
            </>
          )}
        </main>
        <footer className="jic-tv-status">
          <div className="jic-tv-logo">
            <JamatiaLogo variant="pillars" />
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

          {screenId !== 'shoe-area' && !noticeVisible && (
            <p className="jic-tv-manners">
              {TV_REMINDERS[Math.floor(now.getTime() / 45000) % TV_REMINDERS.length]}
            </p>
          )}
          <span>{tv.label}</span>
          {tv.error && <span role="status">Display update delayed</span>}
          {stale ? (
            'Content update delayed · reconnecting'
          ) : (
            <span>
              {sequence
                ? sequence.phase === 'jamaah'
                  ? 'Jama‘ah time'
                  : 'Dhikr after salah'
                : specialNotice
                  ? specialNotice === 'jummah'
                    ? 'Jummah notice'
                    : 'Ramadan · Taraweeh'
                  : 'Community notices'}
              {posters.length > 1 && ` · ${(slide % posters.length) + 1} / ${posters.length}`}
            </span>
          )}
        </footer>
      </div>
      <TvBrowserSetup key={screenId} screenId={screenId} paired={tv.paired} onConnected={tv.refresh} />
    </div>
  );
}
