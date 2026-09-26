import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_STANDBY_SCENE, DEFAULT_TV_PRESET_SCENES } from '../../../supabase/functions/_shared/tv.js';
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

const cloneScene = (scene) => ({
  ...scene,
  layers: scene.layers.map((layer) => ({ ...layer })),
});

export default function TvDisplayLayoutEditor({ screenId, settings, preset = 'standby', onChange }) {
  const prayers = usePrayerTimes();
  const programmes = usePosters();
  const { events, livestream } = useHomeLiveContent({ eventLimit: 50 });
  const fallback =
    preset === 'standby' ? DEFAULT_STANDBY_SCENE : DEFAULT_TV_PRESET_SCENES[preset];
  const scene =
    preset === 'standby'
      ? settings.standby_scene || cloneScene(DEFAULT_STANDBY_SCENE)
      : settings.preset_scenes?.[preset] || cloneScene(fallback);
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
  }, [preset, scene.id, scene.layers, selected]);

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
    const prepared = { ...next, overlap: true };
    if (preset === 'standby') onChange('standby_scene', prepared);
    else
      onChange('preset_scenes', {
        ...(settings.preset_scenes || {}),
        [preset]: prepared,
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
      ? {
          ...start.item,
          width: start.item.width + dx,
          height: start.item.height + dy,
        }
      : {
          ...start.item,
          x: start.item.x + dx,
          y: start.item.y + dy,
        };
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
    scenes: [scene],
    active_scene_id: scene.id,
    scene_mode: 'normal',
    muted: true,
  };
  const sampleTime =
    prayers.todaysTimes?.jamaah_isha || prayers.todaysTimes?.isha || '8:45 PM';
  const sampleSequence = ['before', 'jamaah', 'dhikr'].includes(preset)
    ? {
        name: 'Isha',
        key: 'isha',
        time: sampleTime,
        phase: preset,
        secondsToJamaah: preset === 'before' ? Math.max(1, (settings.jamaah_lead_minutes || 1) * 60) : 0,
        dhikrSeconds: preset === 'dhikr' ? 60 : 0,
      }
    : null;
  const presetContent = sampleSequence ? (
    <TvPrayerScene
      sequence={sampleSequence}
      jummahNotice={settings.jummah_notice}
      settings={settings}
    />
  ) : preset === 'jummah' ? (
    <TvSpecialNotice mode="jummah" settings={settings} fasting={null} />
  ) : preset === 'ramadan' ? (
    <TvSpecialNotice mode="taraweeh" settings={settings} fasting={null} />
  ) : null;
  const presetLabel = settings.preset_names?.[preset] || (preset === 'standby' ? 'Standby' : preset);

  return (
    <section className="tv-layout-editor" aria-label="Standby layout editor">
      <div className="admin-heading">
        <div>
          <h3>Arrange {presetLabel}</h3>
          <p>Drag blocks on the preview. Use the large corner handle to resize them.</p>
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
            {labels[item.type] || 'Block'}{item.type === 'poster' ? ` ${(item.poster_offset ?? index) + 1}` : ''}
            {item.hidden ? ' · hidden' : ''}
          </button>
        ))}
      </div>

      <div
        ref={canvas}
        className={`tv-layout-canvas ${settings.display_orientation === 'portrait' ? 'is-portrait' : ''}`}
      >
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
            onPointerCancel={() => {
              drag.current = null;
            }}
            onFocus={() => setSelected(item.id)}
          >
            <span>{labels[item.type] || 'Block'}</span>
            {selected === item.id && (
              <span
                className="tv-layout-resize"
                aria-hidden="true"
                onPointerDown={(event) => begin(event, item, true)}
              >
                ↘
              </span>
            )}
          </div>
        ))}
      </div>

      {layer && (
        <div className="tv-layout-selected">
          <strong>{labels[layer.type] || 'Block'}</strong>
          <div className="admin-actions">
            {layer.type !== 'state' && (
              <button
                type="button"
                className="admin-button"
                onClick={() => updateLayer({ ...layer, hidden: !layer.hidden })}
              >
                {layer.hidden ? 'Show block' : 'Hide block'}
              </button>
            )}
            <button type="button" className="admin-button" onClick={() => place({ x: 0, width: 100 })}>
              Full width
            </button>
            <button type="button" className="admin-button" onClick={() => place({ x: 0, width: 50 })}>
              Left half
            </button>
            <button type="button" className="admin-button" onClick={() => place({ x: 50, width: 50 })}>
              Right half
            </button>
            {layer.type === 'times' && (
              <button
                type="button"
                className="admin-button"
                onClick={() =>
                  updateLayer({
                    ...layer,
                    layout: layer.layout === 'vertical' ? 'horizontal' : 'vertical',
                  })
                }
              >
                Prayer times: {layer.layout === 'vertical' ? 'down the side' : 'across'}
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="admin-button"
        onClick={() => {
          if (!window.confirm(`Reset the ${presetLabel} layout to the standard JIC arrangement?`)) return;
          setScene(cloneScene(fallback));
          setSelected(fallback.layers[0]?.id || '');
        }}
      >
        Reset layout
      </button>
    </section>
  );
}
