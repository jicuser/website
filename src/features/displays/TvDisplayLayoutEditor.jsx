import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TV_DISPLAY_LAYOUTS,
  PRAYER_TIMETABLE_LAYOUTS,
} from '../../../supabase/functions/_shared/tv.js';
import { fitRect, layerStyle } from '../../../supabase/functions/_shared/tv-scenes.js';
import { supabase } from '@/lib/supabaseClient';
import { createImageUploader } from '@/lib/imageUpload';
import SceneCanvas from './SceneCanvas';
import TvPrayerScene from '@/components/tv/TvPrayerScene';
import TvSpecialNotice from '@/components/tv/TvSpecialNotice';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import usePosters from '@/hooks/usePosters';
import useSceneHistory from './useSceneHistory';
import TvFinalPreview from './TvFinalPreview';

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

function posterLabel(layer, index) {
  return `Poster ${(layer.poster_offset ?? index) + 1}`;
}

export default function TvDisplayLayoutEditor({
  screenId,
  settings,
  preset = 'standby',
  onChange,
  sceneOverride = null,
  onSceneChange = null,
  titleOverride = '',
  resetScene = null,
  allowBlocks = false,
}) {
  const orientation = settings.display_orientation === 'portrait' ? 'portrait' : 'landscape';
  const prayers = usePrayerTimes({ includeTomorrow: true });
  const programmes = usePosters();
  const { events, livestream } = useHomeLiveContent({ eventLimit: 50 });
  const fallback = defaultScene(orientation, preset);
  const scene =
    sceneOverride ||
    settings.display_layouts?.[orientation]?.[preset] ||
    (orientation === 'landscape'
      ? preset === 'standby'
        ? settings.standby_scene
        : settings.preset_scenes?.[preset]
      : null) ||
    fallback;

  const [selected, setSelected] = useState(scene.layers[0]?.id || '');
  const [now, setNow] = useState(() => new Date());
  const [previewOnly, setPreviewOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assetMessage, setAssetMessage] = useState('');
  const canvas = useRef(null);
  const drag = useRef(null);
  const history = useSceneHistory(`${screenId}:${orientation}:${preset}:${scene.id}`);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scene.layers.some((item) => item.id === selected))
      setSelected(scene.layers[0]?.id || '');
  }, [scene.id, scene.layers, selected]);

  useEffect(() => {
    setPreviewOnly(false);
    setAssetMessage('');
  }, [screenId, orientation, preset]);

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
  const selectedPosterId =
    ['poster', 'poster-next'].includes(layer?.type) && layer.poster_ids?.length === 1
      ? layer.poster_ids[0]
      : '';

  function setScene(next) {
    const safe = { ...next, overlap: true };
    if (onSceneChange) {
      onSceneChange(safe);
      return;
    }
    onChange('display_layouts', {
      ...(settings.display_layouts || {}),
      [orientation]: {
        ...(settings.display_layouts?.[orientation] || {}),
        [preset]: safe,
      },
    });
  }

  function commitScene(next) {
    history.checkpoint(scene);
    setScene(next);
  }

  function updateLayer(next, record = true) {
    const updated = {
      ...scene,
      layers: scene.layers.map((item) => (item.id === next.id ? next : item)),
    };
    if (record) commitScene(updated);
    else setScene(updated);
  }

  function addBlock(type) {
    if (!allowBlocks || !type || scene.layers.length >= 12) return;
    const id = `${type}-${crypto.randomUUID()}`;
    const offset = (scene.layers.length * 7) % 35;
    const next = {
      id,
      type,
      x: 5 + offset,
      y: 5 + offset,
      width: type === 'brand' ? 22 : type === 'clock' || type === 'next' ? 35 : 40,
      height: type === 'brand' ? 15 : type === 'clock' || type === 'next' ? 18 : 30,
    };
    if (type === 'times') next.layout = orientation === 'portrait' ? 'vertical' : 'horizontal';
    if (type === 'poster') Object.assign(next, { rotation_seconds: 20 });
    if (type === 'text') next.text = 'New notice';
    commitScene({ ...scene, layers: [...scene.layers, { ...next, ...fitRect(next) }] });
    setSelected(id);
  }

  function removeSelectedBlock() {
    if (!allowBlocks || !layer) return;
    commitScene({ ...scene, layers: scene.layers.filter((item) => item.id !== layer.id) });
    const remaining = scene.layers.filter((item) => item.id !== layer.id);
    setSelected(remaining[0]?.id || '');
  }

  function changeBlockType(type) {
    if (!allowBlocks || !layer || !type) return;
    const next = {
      id: layer.id,
      type,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
    };
    if (type === 'times') next.layout = orientation === 'portrait' ? 'vertical' : 'horizontal';
    if (type === 'poster') Object.assign(next, { rotation_seconds: 20 });
    if (type === 'text') next.text = 'New notice';
    updateLayer(next);
  }

  function begin(event, item, resize = false) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(item.id);
    history.checkpoint(scene);
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
    const fitted = fitRect(raw);
    const grid = event.shiftKey ? 1 : 5;
    const snapped = Object.fromEntries(
      ['x', 'y', 'width', 'height'].map((key) => [
        key,
        Math.round(fitted[key] / grid) * grid,
      ]),
    );
    updateLayer({ ...start.item, ...fitRect({ ...fitted, ...snapped }) }, false);
  }

  function finish(event) {
    event.stopPropagation();
    drag.current = null;
  }

  async function uploadPresetImage(file) {
    if (!file || layer?.type !== 'state' || uploading) return;
    setUploading(true);
    setAssetMessage('');
    try {
      const url = await createImageUploader(supabase)(file, `tv-presets/${screenId}`);
      updateLayer({ ...layer, image_url: url, image_fit: layer.image_fit || 'contain' });
      setAssetMessage('Preset image selected.');
    } catch (error) {
      setAssetMessage(error.message);
    } finally {
      setUploading(false);
    }
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
  const sampleSequence = !sceneOverride && ['before', 'jamaah', 'dhikr'].includes(preset)
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
  ) : !sceneOverride && preset === 'jummah' ? (
    <TvSpecialNotice mode="jummah" settings={settings} fasting={null} />
  ) : !sceneOverride && preset === 'ramadan' ? (
    <TvSpecialNotice mode="taraweeh" settings={settings} fasting={null} />
  ) : null;
  const presetLabel =
    titleOverride ||
    settings.preset_names?.[preset] ||
    (preset === 'standby' ? 'Standby' : preset);

  return (
    <section className="tv-layout-editor" aria-label={`${presetLabel} layout editor`}>
      <div className="tv-layout-toolbar">
        <div>
          <strong>{presetLabel}</strong>
          <span>{orientation === 'portrait' ? '9:16 portrait' : '16:9 landscape'}</span>
        </div>
        <div className="tv-layout-history">
          <button
            type="button"
            className="admin-button"
            disabled={!history.canUndo}
            onClick={() => history.undo(scene, setScene)}
          >
            Undo
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={!history.canRedo}
            onClick={() => history.redo(scene, setScene)}
          >
            Redo
          </button>
          <button
            type="button"
            className="admin-button"
            aria-pressed={previewOnly}
            onClick={() => setPreviewOnly((value) => !value)}
          >
            {previewOnly ? 'Close preview' : 'Preview TV'}
          </button>
        </div>
      </div>

      <div
        ref={canvas}
        className={`tv-layout-canvas ${orientation === 'portrait' ? 'is-portrait' : ''} ${previewOnly ? 'is-final-preview' : ''}`}
      >
        {!previewOnly && <div className="tv-layout-grid" aria-hidden="true" />}
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

        {!previewOnly &&
          scene.layers
            .filter((item) => !item.hidden)
            .map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`${labels[item.type] || 'Block'} layout`}
                aria-pressed={selected === item.id}
                className={`tv-layout-box ${selected === item.id ? 'is-selected' : ''}`}
                style={{ ...layerStyle(item), zIndex: 20 }}
                onPointerDown={(event) => begin(event, item)}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onFocus={() => setSelected(item.id)}
              >
                {selected === item.id && <span>{labels[item.type] || 'Block'}</span>}
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

      {!previewOnly && (
        <>
          <div className="tv-layout-controls">
            {allowBlocks && (
              <label>
                Add block
                <select
                  value=""
                  disabled={scene.layers.length >= 12}
                  onChange={(event) => {
                    addBlock(event.target.value);
                    event.target.value = '';
                  }}
                >
                  <option value="">Choose…</option>
                  <option value="poster">Poster</option>
                  <option value="times">Prayer timetable</option>
                  <option value="next">Next Salah</option>
                  <option value="clock">Clock</option>
                  <option value="brand">JIC logo</option>
                  <option value="text">Text notice</option>
                </select>
              </label>
            )}
            <label>
              Block
              <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                {scene.layers.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    {['poster', 'poster-next'].includes(item.type) ? posterLabel(item, index) : labels[item.type] || 'Block'}
                    {item.hidden ? ' · hidden' : ''}
                  </option>
                ))}
              </select>
            </label>

            {allowBlocks && layer && (
              <label>
                Shows
                <select value={layer.type} onChange={(event) => changeBlockType(event.target.value)}>
                  <option value="poster">Poster</option>
                  <option value="times">Prayer timetable</option>
                  <option value="next">Next Salah</option>
                  <option value="clock">Clock</option>
                  <option value="brand">JIC logo</option>
                  <option value="text">Text notice</option>
                </select>
              </label>
            )}

            {layer?.type === 'times' && (
              <label>
                Timetable style
                <select
                  value={layer.layout || 'horizontal'}
                  onChange={(event) => updateLayer({ ...layer, layout: event.target.value })}
                >
                  {prayerStyles.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {layer?.type === 'text' && (
              <label>
                Text
                <textarea
                  rows={3}
                  maxLength={1200}
                  value={layer.text || ''}
                  onChange={(event) => updateLayer({ ...layer, text: event.target.value })}
                />
              </label>
            )}

            {layer && (
              <button
                type="button"
                className="admin-button"
                onClick={() => updateLayer({ ...layer, hidden: !layer.hidden })}
                disabled={layer.type === 'state'}
              >
                {layer.hidden ? 'Show block' : 'Hide block'}
              </button>
            )}
            {allowBlocks && layer && (
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  if (window.confirm('Remove this block from the scene?')) removeSelectedBlock();
                }}
              >
                Remove block
              </button>
            )}
          </div>

          {['poster', 'poster-next'].includes(layer?.type) && (
            <label className="tv-layer-content-picker">
              Poster in this box
              <select
                value={selectedPosterId}
                onChange={(event) =>
                  updateLayer({
                    ...layer,
                    poster_ids: event.target.value ? [event.target.value] : undefined,
                  })
                }
              >
                <option value="">Rotate automatically</option>
                {posters.map((poster) => (
                  <option key={poster.id} value={poster.id}>
                    {poster.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {layer?.type === 'state' && (
            <div className="tv-state-asset-picker">
              <strong>Preset artwork</strong>
              <p>Keep the live preset, or use a JPG/PNG image for this scene.</p>
              <div className="admin-actions">
                <label className="admin-button tv-upload-button">
                  {uploading ? 'Uploading…' : 'Choose JPG / PNG'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={uploading}
                    onChange={(event) => uploadPresetImage(event.target.files?.[0])}
                  />
                </label>
                {layer.image_url && (
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => updateLayer({ ...layer, image_url: '', image_fit: 'contain' })}
                  >
                    Use live preset
                  </button>
                )}
              </div>
              {layer.image_url && (
                <label>
                  Image fit
                  <select
                    value={layer.image_fit || 'contain'}
                    onChange={(event) => updateLayer({ ...layer, image_fit: event.target.value })}
                  >
                    <option value="contain">Fit whole image</option>
                    <option value="cover">Fill box</option>
                  </select>
                </label>
              )}
              {assetMessage && <p role="status">{assetMessage}</p>}
            </div>
          )}

          <button
            type="button"
            className="admin-button tv-reset-layout"
            onClick={() => {
              if (!window.confirm(`Reset the ${orientation} ${presetLabel} layout?`)) return;
              const reset = resetScene
                ? cloneScene(resetScene)
                : defaultScene(orientation, preset);
              commitScene(reset);
              setSelected(reset.layers[0]?.id || '');
            }}
          >
            Reset this {orientation} layout
          </button>
        </>
      )}

      <TvFinalPreview
        open={previewOnly}
        onClose={() => setPreviewOnly(false)}
        orientation={orientation}
        title={presetLabel}
      >
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
      </TvFinalPreview>
    </section>
  );
}
