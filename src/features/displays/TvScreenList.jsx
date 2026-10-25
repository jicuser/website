import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, Monitor, RefreshCw } from 'lucide-react';
import { TV_SCREENS, tvRequest } from '@/lib/tvControl';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import { tvAutomaticState } from '@/lib/tvAutomaticState';
import {
  activeTvScene,
  normaliseTvSettings,
  tvAutomaticScene,
} from '../../../supabase/functions/_shared/tv.js';
import TvLayoutThumbnail from './TvLayoutThumbnail';

export default function TvScreenList({ onOpen }) {
  const [filter, setFilter] = useState('all');
  const [states, setStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const request = useRef(null);
  const prayers = usePrayerTimes({ includeTomorrow: true });

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    const results = await Promise.allSettled(
      TV_SCREENS.map((screen) =>
        tvRequest('admin', screen.id, {}, { staff: true, signal: controller.signal }),
      ),
    );
    if (controller.signal.aborted) return;
    setStates(
      Object.fromEntries(
        results.map((result, index) => [
          TV_SCREENS[index].id,
          result.status === 'fulfilled'
            ? { data: result.value }
            : { error: result.reason?.message || 'Screen settings could not be loaded.' },
        ]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    return () => request.current?.abort();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const matches = (screen, value) =>
    value === 'all' ||
    (Boolean(states[screen.id]?.data) &&
      (value === 'live'
        ? Boolean(states[screen.id].data.presentation)
        : !states[screen.id].data.presentation));
  const screens = TV_SCREENS.filter((screen) => matches(screen, filter));
  const hasErrors = Object.values(states).some((state) => state.error);

  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">JIC · SCREEN CONTROL</span>
          <h2>TV screens</h2>
        </div>
        <button type="button" className="admin-button" disabled={loading} onClick={load}>
          <RefreshCw size={17} aria-hidden="true" />
          {loading ? 'Checking…' : 'Refresh'}
        </button>
      </div>
      <div className="tv-screen-filters" role="group" aria-label="Filter TV screens">
        {[
          ['all', 'All'],
          ['automatic', 'Automatic'],
          ['live', 'Live'],
        ].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {label}{' '}
            <span>
              {loading && id !== 'all'
                ? '…'
                : TV_SCREENS.filter((screen) => matches(screen, id)).length}
            </span>
          </button>
        ))}
      </div>
      {hasErrors && (
        <p className="stream-feedback" role="status">
          Some settings could not be checked. Open a screen to retry.
        </p>
      )}
      <div className="tv-screen-overview-grid">
        {screens.map((screen) => {
          const state = states[screen.id];
          const data = state?.data;
          const presenting = Boolean(data?.presentation);
          const settings = data ? normaliseTvSettings(data.settings) : null;
          const content = !settings
            ? null
            : presenting
              ? {
                  name: activeTvScene(settings)?.name || 'Live presentation',
                  scene: activeTvScene(settings),
                }
              : tvAutomaticScene(settings, now, {
                  preset: tvAutomaticState(settings, now, prayers, screen.id).preset,
                });
          return (
            <article className="tv-screen-overview-card" key={screen.id}>
              <button
                type="button"
                className="tv-screen-open"
                aria-label={`Open ${screen.label} display`}
                onClick={() => onOpen(screen.id)}
              >
                {content?.scene ? (
                  <figure className="tv-screen-miniature">
                    <TvLayoutThumbnail
                      scene={content.scene}
                      orientation={settings.display_orientation}
                    />
                    <figcaption className="sr-only">Saved layout preview</figcaption>
                  </figure>
                ) : (
                  <span className="tv-screen-preview-unavailable" aria-hidden="true">
                    <Monitor size={26} />
                  </span>
                )}
                <span className="tv-screen-overview-body">
                  <span className="tv-screen-overview-title">
                    <strong>{screen.label}</strong>
                    <span className={`tv-screen-mode ${presenting ? 'is-live' : ''}`}>
                      {data
                        ? presenting
                          ? 'Live presentation'
                          : 'Automatic display'
                        : loading
                          ? 'Checking…'
                          : 'Status unavailable'}
                    </span>
                  </span>
                  <span className="tv-screen-overview-mode">
                    <span>{content?.name || 'Open screen controls'}</span>
                    {settings && (
                      <small>
                        {settings.display_orientation === 'portrait'
                          ? 'Portrait · 9:16'
                          : 'Landscape · 16:9'}
                      </small>
                    )}
                  </span>
                </span>
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
      {!screens.length && (
        <p className="tv-screen-picker-note" role="status">
          {loading ? 'Checking screens…' : 'No screens in this view.'}
        </p>
      )}
      <p className="tv-screen-picker-note">
        Choose a screen to manage its layout, content, timing and live sessions.
      </p>
    </>
  );
}
