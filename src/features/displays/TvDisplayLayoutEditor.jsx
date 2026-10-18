import React, { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TV_DISPLAY_LAYOUTS,
  PRAYER_TIMETABLE_LAYOUTS,
} from '../../../supabase/functions/_shared/tv.js';
import { fitRect } from '../../../supabase/functions/_shared/tv-scenes.js';
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
import LayoutCanvas from './LayoutCanvas';
import EditorViewport from './EditorViewport';
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
  disabled = false,
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

  const [selected, setSelected] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [previewOnly, setPreviewOnly] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [snap, setSnap] = useState(true);
  const expandButton = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [assetMessage, setAssetMessage] = useState('');
  const latestEditor = useRef(null);
  const history = useSceneHistory(`${screenId}:${orientation}:${preset}:${scene.id}`);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scene.layers.some((item) => item.id === selected)) setSelected('');
  }, [scene.id, scene.layers, selected]);

  useEffect(() => {
    setPreviewOnly(false);
    setCropping(false);
    setAssetMessage('');
  }, [screenId, orientation, preset, scene.id]);

  useEffect(() => {
    setAssetMessage('');
    setCropping(false);
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
    if (disabled) return;
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
    if (disabled || !type || scene.layers.length >= 12) return;
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
    setInspectorOpen(true);
  }

  function removeSelectedBlock() {
    if (disabled || !layer) return;
    commitScene({ ...scene, layers: scene.layers.filter((item) => item.id !== layer.id) });
    setSelected('');
  }

  function changeBlockType(type) {
    if (disabled || !layer || !type) return;
    setCropping(false);
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

  function chooseLayer(id) {
    setSelected(id);
    setInspectorOpen(true);
    setCropping(false);
  }

  function reorder(front) {
    if (!layer) return;
    const others = scene.layers.filter((item) => item.id !== layer.id);
    commitScene({ ...scene, layers: front ? [...others, layer] : [layer, ...others] });
  }

  const editorKey = `${screenId}:${orientation}:${preset}:${scene.id}`;
  latestEditor.current = { key: editorKey, scene, updateLayer };

  async function uploadPresetImage(file) {
    if (disabled || !file || layer?.type !== 'state' || uploading) return;
    setUploading(true);
    setAssetMessage('');
    try {
      const url = await createImageUploader(supabase)(file, `tv-presets/${screenId}`);
      const current = latestEditor.current;
      const target = current.scene.layers.find(
        (item) => item.id === layer.id && item.type === 'state',
      );
      if (current.key !== editorKey || !target) return;
      current.updateLayer({ ...target, image_url: url, image_fit: target.image_fit || 'contain' });
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

  const canCrop = Boolean(
    layer &&
    (['poster', 'poster-next'].includes(layer.type) || (layer.type === 'state' && layer.image_url)),
  );
  useEffect(() => {
    if (!canCrop || layer?.hidden) setCropping(false);
  }, [canCrop, layer?.hidden]);
  const editor = (
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
            disabled={disabled || !history.canUndo}
            onClick={() => history.undo(scene, setScene)}
          >
            Undo
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={disabled || !history.canRedo}
            onClick={() => history.redo(scene, setScene)}
          >
            Redo
          </button>
          {!expanded && (
            <button
              ref={expandButton}
              type="button"
              className="admin-button"
              onClick={() => setExpanded(true)}
            >
              Larger editor
            </button>
          )}
          <button type="button" className="admin-button" onClick={() => setPreviewOnly(true)}>
            Preview
          </button>
        </div>
      </div>

      <div className="tv-item-selection">
        <div className="tv-item-selection-heading">
          <strong>Items on this screen</strong>
          <span>Select an item here or tap it in the preview.</span>
        </div>
        <div className="tv-item-choices" role="group" aria-label="Items on this screen">
          {scene.layers.map((item, index) => (
            <button
              type="button"
              key={item.id}
              data-layer-id={item.id}
              disabled={disabled}
              aria-pressed={selected === item.id}
              onClick={() => chooseLayer(item.id)}
            >
              {contentLabel(item, index)}
              {item.hidden ? ' · hidden' : ''}
            </button>
          ))}
          {scene.layers.length === 0 && (
            <p>No items yet. Add a timetable, poster or message below.</p>
          )}
        </div>
      </div>

      <LayoutCanvas
        key={editorKey}
        layers={scene.layers}
        selectedId={selected}
        onSelect={chooseLayer}
        onEdit={() => setInspectorOpen(true)}
        onChange={(next) => updateLayer(next, false)}
        onCheckpoint={() => history.checkpoint(scene)}
        orientation={orientation}
        disabled={disabled}
        snap={snap}
        crop={cropping && canCrop && !layer?.hidden}
        labelFor={contentLabel}
      >
        <SceneCanvas
          preview
          showFallbackBrand={false}
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
      </LayoutCanvas>

      {layer ? (
        <div className="tv-selection-actions" aria-label="Selected content actions">
          <strong>
            {selectedLabel}
            {layer.hidden ? ' · hidden' : ''}
          </strong>
          <div className="tv-selection-buttons">
            <button
              type="button"
              className="admin-button"
              aria-expanded={inspectorOpen}
              onClick={() => setInspectorOpen((open) => !open)}
            >
              {inspectorOpen ? 'Close item settings' : 'Edit item'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={disabled}
              onClick={() => updateLayer({ ...layer, hidden: !layer.hidden })}
            >
              {layer.hidden ? 'Show' : 'Hide'}
            </button>
            <details className="tv-item-actions-more">
              <summary>More item actions</summary>
              <div>
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled}
                  onClick={removeSelectedBlock}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled || scene.layers.at(-1)?.id === layer.id}
                  onClick={() => reorder(true)}
                >
                  Bring to front
                </button>
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled || scene.layers[0]?.id === layer.id}
                  onClick={() => reorder(false)}
                >
                  Send to back
                </button>
              </div>
            </details>
            {canCrop && (
              <button
                type="button"
                className="admin-button"
                disabled={disabled || layer.hidden}
                aria-pressed={cropping}
                onClick={() => {
                  if (!cropping && layer.image_fit !== 'cover')
                    updateLayer({
                      ...layer,
                      image_fit: 'cover',
                      image_position: layer.image_position || { x: 50, y: 50 },
                    });
                  setCropping((active) => !active);
                }}
              >
                {cropping ? 'Done cropping' : 'Crop image'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="tv-layout-help">
          Tap an item to edit it. Then drag it to move, or drag a corner to resize.
        </p>
      )}
      {cropping && (
        <p className="tv-layout-help">
          Drag the image inside its frame. Drag a corner to change the crop area.
        </p>
      )}

      {layer && inspectorOpen && (
        <>
          <fieldset className="tv-layout-controls" disabled={disabled}>
            <legend>{selectedLabel} settings</legend>

            {layer && (
              <label>
                Item type
                <select
                  value={layer.type}
                  onChange={(event) => changeBlockType(event.target.value)}
                >
                  {allowBlocks ? (
                    <option value="poster">Poster</option>
                  ) : (
                    <option value="state">Automatic prayer message</option>
                  )}
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
                {assetMessage && <p role="status">{assetMessage}</p>}
              </div>
            )}
            {canCrop && (
              <label>
                Image fit
                <select
                  value={layer.image_fit || 'contain'}
                  onChange={(event) => {
                    updateLayer({ ...layer, image_fit: event.target.value });
                    setCropping(false);
                  }}
                >
                  <option value="contain">Show whole image</option>
                  <option value="cover">Fill frame / crop</option>
                </select>
              </label>
            )}
            <details className="tv-precise-position">
              <summary>Position and size</summary>
              <div className="tv-layout-position">
                {Object.entries({
                  x: 'From left',
                  y: 'From top',
                  width: 'Width',
                  height: 'Height',
                }).map(([field, name]) => (
                  <label key={field}>
                    {name} (%)
                    <input
                      type="number"
                      min={field === 'width' || field === 'height' ? 5 : 0}
                      max={100}
                      step={1}
                      value={Math.round(layer[field])}
                      onChange={(event) => {
                        const number = Number(event.target.value);
                        if (event.target.value !== '' && Number.isFinite(number))
                          updateLayer({ ...layer, ...fitRect({ ...layer, [field]: number }) });
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
          </fieldset>
        </>
      )}

      <label className="tv-layout-add-content">
        Add an item
        <select
          value=""
          disabled={disabled || scene.layers.length >= 12}
          onChange={(event) => addBlock(event.target.value)}
        >
          <option value="">Choose an item to add…</option>
          {allowBlocks ? (
            <option value="poster">Poster</option>
          ) : (
            <option value="state">Automatic prayer message</option>
          )}
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

      <details className="tv-editor-advanced">
        <summary>Advanced layout tools</summary>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={snap}
            onChange={(event) => setSnap(event.target.checked)}
          />
          Align items to the grid
        </label>
        <p className="tv-layout-help">
          Restore this section’s original arrangement. You can use Undo to recover your last edit.
        </p>
        <button
          type="button"
          className="admin-button tv-reset-layout"
          disabled={disabled}
          onClick={() => {
            if (!window.confirm(`Reset the ${orientation} ${presetLabel} layout?`)) return;
            const reset = resetScene ? cloneScene(resetScene) : defaultScene(orientation, preset);
            commitScene(reset);
            setSelected('');
          }}
        >
          Restore default layout
        </button>
      </details>

      <TvFinalPreview
        open={previewOnly}
        onClose={() => setPreviewOnly(false)}
        orientation={orientation}
        title={presetLabel}
      >
        <SceneCanvas
          preview
          showFallbackBrand={false}
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
  return (
    <EditorViewport
      suspended={previewOnly}
      expanded={expanded}
      title={presetLabel}
      onClose={() => setExpanded(false)}
      returnFocusRef={expandButton}
    >
      {editor}
    </EditorViewport>
  );
}
