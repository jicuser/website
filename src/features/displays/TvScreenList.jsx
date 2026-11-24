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
    setStates((previous) =>
      Object.fromEntries(
        TV_SCREENS.map((screen) => [
          screen.id,
          { ...previous[screen.id], loading: true, error: '' },
        ]),
      ),
    );
    await Promise.all(
      TV_SCREENS.map(async (screen) => {
        let next;
        try {
          const data = await tvRequest(
            'admin',
            screen.id,
            {},
            {
              staff: true,
              signal: controller.signal,
            },
          );
          next = { data, loading: false };
        } catch (error) {
          next = {
            error: error?.message || 'Screen settings could not be loaded.',
            loading: false,
          };
        }
        if (!controller.signal.aborted) {
          setStates((previous) => ({ ...previous, [screen.id]: next }));
        }
      }),
    );
    if (!controller.signal.aborted) setLoading(false);
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
      {filter !== 'all' && (
        <div className="tv-screen-catalogue">
          <div className="tv-screen-catalogue-heading">
            <span>Open any screen</span>
            <button type="button" className="admin-button" onClick={() => setFilter('all')}>
              Show all screens
            </button>
          </div>
          <div
            className="tv-screen-catalogue-links"
            role="group"
            aria-label="All TV screen controls"
          >
            {TV_SCREENS.map((screen) => (
              <button
                key={screen.id}
                type="button"
                className="admin-button"
                aria-label={`Open controls for ${screen.label}`}
                onClick={() => onOpen(screen.id)}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {hasErrors && (
        <p className="stream-feedback" role="status">
          Some screen statuses could not be checked. Every screen can still be opened. Refresh to
          retry.
        </p>
      )}
      <div className="tv-screen-overview-grid">
        {screens.map((screen) => {
          const state = states[screen.id];
          const data = state?.data;
          const checking = state?.loading ?? loading;
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
                      {checking
                        ? 'Checking…'
                        : data
                          ? presenting
                            ? 'Live presentation'
                            : 'Automatic display'
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
          {loading
            ? 'Checking screen statuses… All screen controls remain available above.'
            : filter === 'live'
              ? 'No live presentations found. Open a screen above or show all screens.'
              : 'No automatic displays found. Open a screen above or show all screens.'}
        </p>
      )}
      <p className="tv-screen-picker-note">
        Choose a screen to manage its layout, content, timing and live sessions.
      </p>
    </>
  );
}
