import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TV_DISPLAY_LAYOUTS,
  PRAYER_TIMETABLE_LAYOUTS,
} from '../../../supabase/functions/_shared/tv.js';
import { fitRect, layerStyle } from '../../../supabase/functions/_shared/tv-scenes.js';
import { snapRect } from '@/lib/sceneLayouts';
import SceneCanvas from './SceneCanvas';
import TvPrayerScene from '@/components/tv/TvPrayerScene';
import TvSpecialNotice from '@/components/tv/TvSpecialNotice';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';

const labels = {
  times: 'Prayer timetable',
  next: 'Next Salah',
  clock: 'Clock & date',
  poster: 'Poster',
  'poster-next': 'Poster',
  brand: 'JIC logo',
  state: 'Preset content',
  text: 'Notice',
};

const prayerStyles = [
  ['horizontal', 'Across cards'],
  ['compact', 'Compact table'],
  ['clock-table', 'Clock + table'],
  ['vertical', 'Vertical table'],
].filter(([id]) => PRAYER_TIMETABLE_LAYOUTS.includes(id));

const cloneScene = (scene) => ({
  ...scene,
  layers: (scene?.layers || []).map((layer) => ({ ...layer })),
});

function defaultScene(orientation, preset) {
  return cloneScene(DEFAULT_TV_DISPLAY_LAYOUTS[orientation]?.[preset]);
}

function withLayer(scene, id, changes) {
  return {
    ...scene,
    layers: scene.layers.map((item) => (item.id === id ? { ...item, ...changes } : item)),
  };
}

function quickLayout(scene, orientation, preset, mode) {
  if (preset !== 'standby') {
    const state = scene.layers.find((item) => item.type === 'state');
    const times = scene.layers.find((item) => item.type === 'times');
    let next = cloneScene(scene);
    if (!state) return next;
    if (orientation === 'portrait') {
      next = withLayer(next, state.id, { x: 0, y: 0, width: 100, height: 58, hidden: false });
      if (times)
        next = withLayer(next, times.id, {
          x: 0,
          y: 58,
          width: 100,
          height: 30,
          layout: mode === 'prayer' ? 'vertical' : 'compact',
          hidden: false,
        });
    } else {
      next = withLayer(next, state.id, {
        x: mode === 'split' ? 48 : 0,
        y: 0,
        width: mode === 'split' ? 52 : 100,
        height: 100,
        hidden: false,
      });
      if (times)
        next = withLayer(next, times.id, {
          x: 0,
          y: 0,
          width: mode === 'split' ? 48 : 100,
          height: mode === 'split' ? 100 : 24,
          layout: mode === 'split' ? 'compact' : 'horizontal',
          hidden: false,
        });
    }
    return next;
  }

  const next = cloneScene(scene);
  const times = next.layers.find((item) => item.type === 'times');
  const posters = next.layers.filter((item) => ['poster', 'poster-next'].includes(item.type));
  const nextPrayer = next.layers.find((item) => item.type === 'next');
  const clock = next.layers.find((item) => item.type === 'clock');
  const brand = next.layers.find((item) => item.type === 'brand');

  if (orientation === 'portrait') {
    if (mode === 'prayer') {
      if (times) Object.assign(times, { x: 0, y: 0, width: 100, height: 100, layout: 'vertical', hidden: false });
      posters.forEach((item) => { item.hidden = true; });
      if (nextPrayer) nextPrayer.hidden = true;
      if (clock) clock.hidden = true;
      if (brand) brand.hidden = true;
    } else if (mode === 'poster') {
      if (times) Object.assign(times, { x: 0, y: 0, width: 100, height: 24, layout: 'compact', hidden: false });
      posters.forEach((item, index) => Object.assign(item, {
        x: 0,
        y: 24,
        width: 100,
        height: 66,
        hidden: index > 0,
      }));
      if (nextPrayer) nextPrayer.hidden = true;
      if (clock) Object.assign(clock, { x: 24, y: 90, width: 76, height: 10, hidden: false });
      if (brand) Object.assign(brand, { x: 0, y: 90, width: 24, height: 10, hidden: false });
    } else {
      if (times) Object.assign(times, { x: 0, y: 0, width: 100, height: 34, layout: 'vertical', hidden: false });
      if (nextPrayer) Object.assign(nextPrayer, { x: 0, y: 34, width: 100, height: 8, hidden: false });
      posters.forEach((item, index) => Object.assign(item, {
        x: index % 2 === 0 ? 0 : 50,
        y: 42,
        width: 50,
        height: 40,
        hidden: index > 1,
      }));
      if (brand) Object.assign(brand, { x: 0, y: 82, width: 24, height: 18, hidden: false });
      if (clock) Object.assign(clock, { x: 24, y: 82, width: 76, height: 18, hidden: false });
    }
    return next;
  }

  if (mode === 'prayer') {
    if (times) Object.assign(times, { x: 0, y: 0, width: 100, height: 100, layout: 'clock-table', hidden: false });
    posters.forEach((item) => { item.hidden = true; });
    if (nextPrayer) nextPrayer.hidden = true;
    if (clock) clock.hidden = true;
    if (brand) brand.hidden = true;
  } else if (mode === 'split') {
    if (times) Object.assign(times, { x: 0, y: 0, width: 55, height: 100, layout: 'clock-table', hidden: false });
    posters.forEach((item, index) => Object.assign(item, {
      x: 55,
      y: 0,
      width: 45,
      height: 100,
      hidden: index > 0,
    }));
    if (nextPrayer) nextPrayer.hidden = true;
    if (clock) clock.hidden = true;
    if (brand) brand.hidden = true;
  } else {
    return defaultScene('landscape', 'standby');
  }
  return next;
}

export default function TvDisplayLayoutEditor({ screenId, settings, preset = 'standby', onChange }) {
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const prayers = usePrayerTimes();
  const programmes = usePosters();
  const { events, livestream } = useHomeLiveContent({ eventLimit: 50 });
  const fallback = defaultScene(orientation, preset);
  const scene =
    settings.display_layouts?.[orientation]?.[preset] ||
    (orientation === 'landscape'
      ? preset === 'standby'
        ? settings.standby_scene
        : settings.preset_scenes?.[preset]
      : null) ||
    fallback;
  const [selected, setSelected] = useState(scene.layers[0]?.id || '');
  const [now, setNow] = useState(() => new Date());
  const canvas = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!scene.layers.some((item) => item.id === selected))
      setSelected(scene.layers[0]?.id || '');
  }, [orientation, preset, scene.id, scene.layers, selected]);

  const layer = scene.layers.find((item) => item.id === selected) || null;
  const posters = [
    ...programmes,
    ...(events || [])
      .filter((event) => event.poster_url)
      .map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        image: event.poster_url,
        alt: event.title,
      })),
  ];

  function setScene(next) {
    onChange('display_layouts', {
      ...(settings.display_layouts || {}),
      [orientation]: {
        ...(settings.display_layouts?.[orientation] || {}),
        [preset]: { ...next, overlap: true },
      },
    });
  }

  function updateLayer(next) {
    setScene({
      ...scene,
      layers: scene.layers.map((item) => (item.id === next.id ? next : item)),
    });
  }

  function begin(event, item, resize = false) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(item.id);
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      item,
      resize,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    const start = drag.current;
    if (!start) return;
    const dx = ((event.clientX - start.startX) / start.width) * 100;
    const dy = ((event.clientY - start.startY) / start.height) * 100;
    const raw = start.resize
      ? { ...start.item, width: start.item.width + dx, height: start.item.height + dy }
      : { ...start.item, x: start.item.x + dx, y: start.item.y + dy };
    const next = snapRect(
      fitRect(raw),
      scene.layers.filter((item) => item.id !== start.item.id && !item.hidden),
      { resize: start.resize },
    );
    updateLayer({ ...start.item, ...next });
  }

  function finish(event) {
    event.stopPropagation();
    drag.current = null;
  }

  function place(rect) {
    if (!layer) return;
    updateLayer({ ...layer, ...fitRect({ ...layer, ...rect }), hidden: false });
  }

  const previewSettings = {
    ...settings,
    display_orientation: orientation,
    scenes: [scene],
    active_scene_id: scene.id,
    scene_mode: 'normal',
    muted: true,
  };
  const sampleTime = prayers.todaysTimes?.jamaah_isha || prayers.todaysTimes?.isha || '8:45 PM';
  const sampleSequence = ['before', 'jamaah', 'dhikr'].includes(preset)
    ? {
        name: 'Isha',
        key: 'isha',
        time: sampleTime,
        phase: preset,
        secondsToJamaah:
          preset === 'before' ? Math.max(1, (settings.jamaah_lead_minutes || 1) * 60) : 0,
        dhikrSeconds: preset === 'dhikr' ? 60 : 0,
      }
    : null;
  const presetContent = sampleSequence ? (
    <TvPrayerScene sequence={sampleSequence} jummahNotice={settings.jummah_notice} settings={settings} />
  ) : preset === 'jummah' ? (
    <TvSpecialNotice mode="jummah" settings={settings} fasting={null} />
  ) : preset === 'ramadan' ? (
    <TvSpecialNotice mode="taraweeh" settings={settings} fasting={null} />
  ) : null;
  const presetLabel = settings.preset_names?.[preset] || (preset === 'standby' ? 'Standby' : preset);

  return (
    <section className="tv-layout-editor" aria-label={`${presetLabel} layout editor`}>
      <div className="admin-heading tv-layout-heading">
        <div>
          <h3>Arrange {presetLabel}</h3>
          <p>{orientation === 'portrait' ? 'Portrait' : 'Landscape'} has its own saved layout.</p>
        </div>
        <div className="tv-quick-layouts" aria-label="Quick layouts">
          {preset === 'standby' ? (
            orientation === 'portrait' ? (
              <>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'balanced'))}>Balanced</button>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'prayer'))}>Prayer board</button>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'poster'))}>Large poster</button>
              </>
            ) : (
              <>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'posters'))}>Timetable + posters</button>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'prayer'))}>Prayer board</button>
                <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'split'))}>Prayer + poster</button>
              </>
            )
          ) : (
            <>
              <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'balanced'))}>Standard</button>
              <button className="admin-button" type="button" onClick={() => setScene(quickLayout(scene, orientation, preset, 'split'))}>Split</button>
            </>
          )}
        </div>
      </div>

      <div className="tv-layout-blocks" aria-label="Display blocks">
        {scene.layers.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className="admin-button"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
          >
            {labels[item.type] || 'Block'}
            {item.type === 'poster' ? ` ${(item.poster_offset ?? index) + 1}` : ''}
            {item.hidden ? ' · hidden' : ''}
          </button>
        ))}
      </div>

      <div ref={canvas} className={`tv-layout-canvas ${orientation === 'portrait' ? 'is-portrait' : ''}`}>
        <div className="tv-layout-render" aria-hidden="true">
          <SceneCanvas
            preview
            tv={{ settings: previewSettings, paired: true, inputs: [] }}
            screenId={screenId}
            now={now}
            prayers={prayers}
            posters={posters}
            slide={0}
            onImageError={() => {}}
            livestream={livestream}
            presetContent={presetContent}
          />
        </div>
        {scene.layers.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`${labels[item.type] || 'Block'} layout`}
            aria-pressed={selected === item.id}
            className={`tv-layout-box ${selected === item.id ? 'is-selected' : ''} ${item.hidden ? 'is-hidden' : ''}`}
            style={{ ...layerStyle(item), zIndex: 20 }}
            onPointerDown={(event) => begin(event, item)}
            onPointerMove={move}
            onPointerUp={finish}
            onPointerCancel={() => { drag.current = null; }}
            onFocus={() => setSelected(item.id)}
          >
            <span>{labels[item.type] || 'Block'}</span>
            {selected === item.id && (
              <span className="tv-layout-resize" aria-hidden="true" onPointerDown={(event) => begin(event, item, true)}>↘</span>
            )}
          </div>
        ))}
      </div>

      {layer && (
        <div className="tv-layout-selected">
          <div className="tv-layout-selected-head">
            <strong>{labels[layer.type] || 'Block'}</strong>
            <button
              type="button"
              className="admin-button"
              onClick={() => updateLayer({ ...layer, hidden: !layer.hidden })}
              disabled={layer.type === 'state'}
            >
              {layer.hidden ? 'Show' : 'Hide'}
            </button>
          </div>
          {layer.type === 'times' && (
            <label className="tv-prayer-style">
              Prayer timetable style
              <select
                value={layer.layout || 'horizontal'}
                onChange={(event) => updateLayer({ ...layer, layout: event.target.value })}
              >
                {prayerStyles.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          )}
          <div className="admin-actions tv-position-actions">
            <button type="button" className="admin-button" onClick={() => place({ x: 0, y: 0, width: 100, height: layer.height })}>Top full width</button>
            <button type="button" className="admin-button" onClick={() => place({ x: 0, width: 100 })}>Full width</button>
            <button type="button" className="admin-button" onClick={() => place({ x: 0, width: 50 })}>Left half</button>
            <button type="button" className="admin-button" onClick={() => place({ x: 50, width: 50 })}>Right half</button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="admin-button tv-reset-layout"
        onClick={() => {
          if (!window.confirm(`Reset the ${orientation} ${presetLabel} layout?`)) return;
          const reset = defaultScene(orientation, preset);
          setScene(reset);
          setSelected(reset.layers[0]?.id || '');
        }}
      >
        Reset this {orientation} layout
      </button>
    </section>
  );
}
