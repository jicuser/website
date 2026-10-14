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
import TvFinalPreview, { TvScaledPreview } from './TvFinalPreview';
import { tvPresetLabel } from '@/lib/tvEditorLabels';

const labels = {
  times: 'Prayer timetable',
  next: 'Next prayer',
  clock: 'Clock',
  poster: 'Poster',
  'poster-next': 'Poster',
  brand: 'JIC logo',
  state: 'Prayer message',
  text: 'Text notice',
};

const prayerStyles = [
  ['horizontal', 'Prayer cards in a row'],
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
  const [editingPosition, setEditingPosition] = useState(false);
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
    if (!scene.layers.some((item) => item.id === selected)) setSelected(scene.layers[0]?.id || '');
  }, [scene.id, scene.layers, selected]);

  useEffect(() => {
    setPreviewOnly(false);
    setEditingPosition(false);
    setAssetMessage('');
    drag.current = null;
  }, [screenId, orientation, preset, scene.id]);

  useEffect(() => {
    setAssetMessage('');
    setEditingPosition(false);
    drag.current = null;
  }, [selected]);

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
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      item,
      resize,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      started: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function move(event) {
    const start = drag.current;
    if (!start) return;
    if (!start.started) {
      if (Math.hypot(event.clientX - start.startX, event.clientY - start.startY) < 3) return;
      history.checkpoint(scene);
      start.started = true;
    }
    const dx = ((event.clientX - start.startX) / start.width) * 100;
    const dy = ((event.clientY - start.startY) / start.height) * 100;
    const raw = start.resize
      ? { ...start.item, width: start.item.width + dx, height: start.item.height + dy }
      : { ...start.item, x: start.item.x + dx, y: start.item.y + dy };
    const fitted = fitRect(raw);
    const grid = event.shiftKey ? 1 : 5;
    const snapped = Object.fromEntries(
      ['x', 'y', 'width', 'height'].map((key) => [key, Math.round(fitted[key] / grid) * grid]),
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
      setAssetMessage('Image added to this draft. Save changes to show it on the TV.');
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
  const sampleSequence =
    !sceneOverride && ['before', 'jamaah', 'dhikr'].includes(preset)
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
    <TvPrayerScene
      sequence={sampleSequence}
      jummahNotice={settings.jummah_notice}
      settings={settings}
    />
  ) : !sceneOverride && preset === 'jummah' ? (
    <TvSpecialNotice mode="jummah" settings={settings} fasting={null} />
  ) : !sceneOverride && preset === 'ramadan' ? (
    <TvSpecialNotice mode="taraweeh" settings={settings} fasting={null} />
  ) : null;
  const presetLabel = titleOverride || tvPresetLabel(preset, settings.preset_names);
  const contentLabel = (item, index) =>
    ['poster', 'poster-next'].includes(item.type)
      ? posterLabel(item, index)
      : item.type === 'state'
        ? `${presetLabel} message`
        : labels[item.type] || 'Content';
  const selectedLabel = layer ? contentLabel(layer, scene.layers.indexOf(layer)) : '';

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
          <button type="button" className="admin-button" onClick={() => setPreviewOnly(true)}>
            Full-screen preview
          </button>
        </div>
      </div>

      <div className="tv-layout-selection">
        <label>
          Content to edit
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={!scene.layers.length}
          >
            {!scene.layers.length && <option value="">No content yet</option>}
            {scene.layers.map((item, index) => (
              <option key={item.id} value={item.id}>
                {contentLabel(item, index)}
                {item.hidden ? ' · hidden' : ''}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-button"
          aria-pressed={editingPosition}
          disabled={!layer || layer.hidden}
          onClick={() => setEditingPosition((value) => !value)}
        >
          {editingPosition ? 'Done positioning' : 'Move & resize'}
        </button>
      </div>

      <div
        ref={canvas}
        className={`tv-layout-canvas ${orientation === 'portrait' ? 'is-portrait' : ''} ${editingPosition ? 'is-positioning' : ''}`}
      >
        {editingPosition && <div className="tv-layout-grid" aria-hidden="true" />}
        <div className="tv-layout-render" aria-hidden="true">
          <TvScaledPreview orientation={orientation}>
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
          </TvScaledPreview>
        </div>

        {editingPosition &&
          scene.layers
            .filter((item) => !item.hidden && item.id === selected)
            .map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Move ${selectedLabel}. Use arrow keys to move, or Shift and arrow keys to resize.`}
                className={`tv-layout-box ${selected === item.id ? 'is-selected' : ''}`}
                style={{ ...layerStyle(item), zIndex: 20 }}
                onPointerDown={(event) => begin(event, item)}
                onPointerMove={move}
                onPointerUp={finish}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
                    return;
                  event.preventDefault();
                  const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
                  const field = event.shiftKey
                    ? horizontal
                      ? 'width'
                      : 'height'
                    : horizontal
                      ? 'x'
                      : 'y';
                  const delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
                  updateLayer({ ...item, ...fitRect({ ...item, [field]: item[field] + delta }) });
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onFocus={() => setSelected(item.id)}
              >
                {selected === item.id && (
                  <span
                    className="tv-layout-resize"
                    aria-hidden="true"
                    onPointerDown={(event) => begin(event, item, true)}
                  >
                    <span>↘</span>
                  </span>
                )}
              </div>
            ))}
      </div>

      <p className="tv-layout-help">
        {editingPosition
          ? `Positioning: ${selectedLabel}. Drag the outlined area to move it, or drag its corner to resize.`
          : 'Preview of your draft. Choose content above to edit its settings below.'}
      </p>

      {editingPosition && layer && (
        <fieldset className="tv-layout-position">
          <legend>Position & size (%)</legend>
          {Object.entries({ x: 'From left', y: 'From top', width: 'Width', height: 'Height' }).map(
            ([field, name]) => (
              <label key={field}>
                {name}
                <input
                  type="number"
                  min={field === 'width' || field === 'height' ? 5 : 0}
                  max={100}
                  step={1}
                  value={Math.round(layer[field])}
                  onChange={(event) => {
                    if (event.target.value === '') return;
                    const number = Number(event.target.value);
                    if (Number.isFinite(number))
                      updateLayer({ ...layer, ...fitRect({ ...layer, [field]: number }) });
                  }}
                />
              </label>
            ),
          )}
        </fieldset>
      )}

      {layer && (
        <>
          <fieldset className="tv-layout-controls">
            <legend>{selectedLabel} settings</legend>

            {allowBlocks && layer && (
              <label>
                Content type
                <select
                  value={layer.type}
                  onChange={(event) => changeBlockType(event.target.value)}
                >
                  <option value="poster">Poster</option>
                  <option value="times">Prayer timetable</option>
                  <option value="next">Next prayer</option>
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

            {layer.type !== 'state' && (
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  updateLayer({ ...layer, hidden: !layer.hidden });
                  setEditingPosition(false);
                }}
              >
                {layer.hidden ? 'Show in this layout' : 'Hide in this layout'}
              </button>
            )}
            {allowBlocks && layer && (
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ${selectedLabel} from this layout? You can undo this before saving.`,
                    )
                  )
                    removeSelectedBlock();
                }}
              >
                Remove content
              </button>
            )}

            {['poster', 'poster-next'].includes(layer?.type) && (
              <label className="tv-layer-content-picker">
                Poster to show
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
                <strong>Prayer message or image</strong>
                <p>
                  {layer.image_url
                    ? 'Your image replaces the automatic prayer message in this area.'
                    : 'This area shows the automatic prayer message. You can replace it with an image.'}
                </p>
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
                      Restore prayer message
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
          </fieldset>
        </>
      )}

      {allowBlocks && (
        <label className="tv-layout-add-content">
          Add content to this layout
          <select
            value=""
            disabled={scene.layers.length >= 12}
            onChange={(event) => addBlock(event.target.value)}
          >
            <option value="">Choose content to add…</option>
            <option value="poster">Poster</option>
            <option value="times">Prayer timetable</option>
            <option value="next">Next prayer</option>
            <option value="clock">Clock</option>
            <option value="brand">JIC logo</option>
            <option value="text">Text notice</option>
          </select>
          {scene.layers.length >= 12 && (
            <small>This layout has the maximum of 12 content items.</small>
          )}
        </label>
      )}

      <button
        type="button"
        className="admin-button tv-reset-layout"
        onClick={() => {
          if (!window.confirm(`Reset the ${orientation} ${presetLabel} layout?`)) return;
          const reset = resetScene ? cloneScene(resetScene) : defaultScene(orientation, preset);
          commitScene(reset);
          setSelected(reset.layers[0]?.id || '');
        }}
      >
        Restore default layout
      </button>

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
