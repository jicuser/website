import React, { useEffect, useId, useRef, useState } from 'react';
import {
  SOURCE_TYPES,
  INPUT_SLOTS,
  MAX_SCENES,
  MAX_LAYERS,
  newScene,
  fitRect,
  canPlace,
  layerStyle,
} from '../../../supabase/functions/_shared/tv-scenes.js';
import SceneCanvas from './SceneCanvas';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import useTvPreview from '@/hooks/useTvPreview';
import {
  updateInputCapture,
  updateInputName,
  inputLabel,
  tvInputSources,
} from '@/lib/tvSceneState';

const uid = () => crypto.randomUUID();
const label = (layer) =>
  layer.type === 'input'
    ? inputLabel(layer)
    : SOURCE_TYPES.find(([id]) => id === layer.type)?.[1] || layer.type;
const sourceChoices = [
  ...SOURCE_TYPES.filter(([id]) => id !== 'input'),
  ['input-screen', 'Screen share from a laptop'],
  ['input-camera', 'Camera from a phone or laptop'],
];

export default function SceneEditor({ value, onChange, disabled, posters = [], screenId }) {
  const editorId = useId();
  const prayers = usePrayerTimes();
  const { livestream } = useHomeLiveContent();
  const [preview, setPreview] = useState(false);
  const previewTv = useTvPreview(screenId, preview);
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState('');
  const [adding, setAdding] = useState(false);
  const [source, setSource] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [savedSlot, setSavedSlot] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const nameField = useRef(null);
  const sourceField = useRef(null);
  const properties = useRef(null);
  const canvas = useRef(null);
  const drag = useRef(null);
  const scene = value.scenes.find((item) => item.id === value.active_scene_id) || value.scenes[0];
  const layer = scene.layers.find((item) => item.id === selected);
  const deviceSources = tvInputSources(value);
  const capture = source === 'input-camera' ? 'camera' : 'screen';
  const isDeviceSource = source.startsWith('input-');
  const unusedSlot = INPUT_SLOTS.find((slot) => !deviceSources.some((item) => item.slot === slot));
  const reusableSources = deviceSources.filter(
    (item) =>
      (!item.capture || item.capture === capture) &&
      !scene.layers.some((candidate) => candidate.type === 'input' && candidate.slot === item.slot),
  );

  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [preview]);

  useEffect(() => {
    if (adding) sourceField.current?.focus();
  }, [adding]);

  function settingsWithScene(next) {
    return { ...value, scenes: value.scenes.map((item) => (item.id === scene.id ? next : item)) };
  }

  function updateScene(next) {
    onChange(settingsWithScene(next));
  }

  function updateLayer(next) {
    if (!canPlace(scene, next)) {
      setMessage('Move sources apart or enable overlap.');
      return;
    }
    setMessage('');
    updateScene({
      ...scene,
      layers: scene.layers.map((item) => (item.id === next.id ? next : item)),
    });
  }

  function chooseScene(id) {
    onChange({ ...value, active_scene_id: id });
    setSelected('');
    setAdding(false);
    setMessage('');
  }

  function openAddContent() {
    setSource('');
    setDeviceName('');
    setSavedSlot('');
    setNameError('');
    setMessage('');
    setAdding(true);
  }

  function addSource() {
    if (disabled || !source || scene.layers.length >= MAX_LAYERS) return;
    const next = {
      id: uid(),
      type: isDeviceSource ? 'input' : source,
      x: scene.layers.length ? 10 : 0,
      y: scene.layers.length ? 15 : 0,
      width: scene.layers.length ? 50 : 100,
      height: scene.layers.length ? 50 : 100,
    };
    if (['youtube', 'camera', 'schedule', 'input'].includes(next.type)) next.audio = false;
    if (['youtube', 'camera'].includes(source)) next.url = '';
    if (source === 'camera') next.protocol = 'hls';
    if (isDeviceSource) {
      const saved = reusableSources.find((item) => item.slot === savedSlot);
      const name = saved?.name?.trim() || deviceName.trim();
      if (!name) {
        setNameError('Enter a device name, for example Lectern phone.');
        nameField.current?.focus();
        return;
      }
      next.slot = saved?.slot || unusedSlot;
      if (!next.slot) {
        setMessage(
          'All four device inputs are in use. Choose a saved device or remove an unused input.',
        );
        return;
      }
      next.name = name;
      next.capture = capture;
    }
    if (source === 'text') next.text = '';
    if (source === 'poster') Object.assign(next, { poster_ids: [], rotation_seconds: 20 });
    if (['times', 'next', 'clock'].includes(source)) {
      Object.assign(next, {
        x: 0,
        y: 0,
        height: source === 'times' ? 18 : 10,
        width: source === 'clock' ? 25 : 100,
      });
    }
    if (!canPlace(scene, next)) {
      setMessage('Enable overlap to add here, then move the source.');
      return;
    }
    const updated = settingsWithScene({ ...scene, layers: [...scene.layers, next] });
    onChange(
      isDeviceSource
        ? updateInputName(
            updateInputCapture(updated, next.slot, next.capture),
            next.slot,
            next.name,
          )
        : updated,
    );
    setSelected(next.id);
    setAdding(false);
    setNameError('');
    setMessage('');
  }

  function removeSource() {
    if (!window.confirm(`Remove “${label(layer)}” from “${scene.name}”? Other scenes are kept.`))
      return;
    const layers = scene.layers.filter((item) => item.id !== layer.id);
    updateScene({ ...scene, layers });
    setSelected(layers.at(-1)?.id || '');
  }

  function begin(event, item, resize = false) {
    if (disabled || event.button !== 0) return;
    event.stopPropagation();
    setSelected(item.id);
    const rect = canvas.current.getBoundingClientRect();
    drag.current = {
      item,
      resize,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const start = drag.current;
    if (!start) return;
    const dx = ((event.clientX - start.startX) / start.width) * 100;
    const dy = ((event.clientY - start.startY) / start.height) * 100;
    const item = start.item;
    const rect = fitRect({
      ...item,
      ...(start.resize
        ? { width: item.width + dx, height: item.height + dy }
        : { x: item.x + dx, y: item.y + dy }),
    });
    updateLayer({ ...item, ...rect });
  }

  function resizeNumber(key, raw) {
    if (raw === '') return;
    const number = Number(raw);
    if (!Number.isFinite(number)) return;
    updateLayer({ ...layer, ...fitRect({ ...layer, [key]: number }) });
  }

  return (
    <section className="admin-panel scene-editor" aria-labelledby={`${editorId}-heading`}>
      <div className="scene-heading">
        <div>
          <h3 id={`${editorId}-heading`}>Build your scene</h3>
          <p>Add content, then drag and resize it on the landscape preview.</p>
        </div>
        <span className="scene-count">
          {scene.layers.length} / {MAX_LAYERS} sources
        </span>
      </div>

      <div className="scene-toolbar">
        <label>
          Scene
          <select
            disabled={disabled}
            value={scene.id}
            onChange={(event) => chooseScene(event.target.value)}
          >
            {value.scenes.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}. {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-button"
          disabled={disabled || value.scenes.length >= MAX_SCENES}
          onClick={() => {
            const next = newScene(uid(), `Scene ${value.scenes.length + 1}`);
            onChange({ ...value, scenes: [...value.scenes, next], active_scene_id: next.id });
            setSelected('');
            setAdding(false);
            setMessage('');
          }}
        >
          + Scene
        </button>
        <button
          type="button"
          className="admin-button primary"
          disabled={disabled || scene.layers.length >= MAX_LAYERS}
          aria-expanded={adding}
          aria-controls={`${editorId}-add`}
          onClick={openAddContent}
        >
          + Add content
        </button>
      </div>

      {adding && (
        <fieldset className="scene-add-content" id={`${editorId}-add`} disabled={disabled}>
          <legend>Add content</legend>
          <label>
            Content type
            <select
              ref={sourceField}
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setSavedSlot('');
                setDeviceName('');
                setNameError('');
                setMessage('');
              }}
            >
              <option value="" disabled>
                Choose what to add
              </option>
              {sourceChoices.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {isDeviceSource && (
            <>
              {reusableSources.length > 0 && (
                <label>
                  Device
                  <select
                    value={savedSlot}
                    onChange={(event) => {
                      setSavedSlot(event.target.value);
                      setDeviceName('');
                      setNameError('');
                    }}
                  >
                    <option value="">Name a new device</option>
                    {reusableSources.map((item) => (
                      <option key={item.slot} value={item.slot}>
                        {inputLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {!reusableSources.find((item) => item.slot === savedSlot)?.name?.trim() && (
                <label>
                  Device name (required)
                  <input
                    ref={nameField}
                    aria-invalid={Boolean(nameError)}
                    aria-describedby={`${editorId}-device-name-help`}
                    value={deviceName}
                    maxLength={60}
                    required
                    placeholder={capture === 'camera' ? 'e.g. Lectern phone' : 'e.g. Office laptop'}
                    onChange={(event) => {
                      setDeviceName(event.target.value);
                      setNameError('');
                    }}
                  />
                  <small
                    id={`${editorId}-device-name-help`}
                    className={nameError ? 'admin-field-error' : ''}
                    role={nameError ? 'alert' : undefined}
                  >
                    {nameError ||
                      'Name it once. Use this saved name when the device starts sharing.'}
                  </small>
                </label>
              )}
              {!savedSlot && !unusedSlot && (
                <p role="status">
                  All four device inputs are saved. Reuse a saved device or remove an unused input.
                </p>
              )}
            </>
          )}
          <div className="scene-action-row">
            <button type="button" className="admin-button" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="admin-button primary"
              disabled={
                !source ||
                scene.layers.length >= MAX_LAYERS ||
                (isDeviceSource && !savedSlot && !unusedSlot)
              }
              onClick={addSource}
            >
              Add to scene
            </button>
          </div>
        </fieldset>
      )}

      {message && (
        <p className="scene-feedback" role="status">
          {message}
        </p>
      )}
      <div className={`scene-workspace ${layer ? 'has-selection' : ''}`}>
        <div className="scene-preview-column">
          {layer && (
            <div className="scene-selected-source" aria-label="Selected source controls">
              <strong title={label(layer)}>{label(layer)}</strong>
              <div className="scene-source-actions">
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled}
                  aria-controls={`${editorId}-properties`}
                  onClick={() => {
                    properties.current?.focus({ preventScroll: true });
                    properties.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                  }}
                >
                  Edit
                </button>
                {'audio' in layer && (
                  <button
                    type="button"
                    className="admin-button"
                    disabled={disabled}
                    aria-pressed={layer.audio}
                    aria-label={`Audio for ${label(layer)}`}
                    onClick={() => updateLayer({ ...layer, audio: !layer.audio })}
                  >
                    Audio {layer.audio ? 'on' : 'off'}
                  </button>
                )}
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled}
                  aria-label={`Remove ${label(layer)}`}
                  onClick={removeSource}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <div
            ref={canvas}
            className={`scene-canvas scene-edit-canvas ${preview ? 'has-preview' : ''}`}
            aria-label="Landscape scene, 16 by 9"
          >
            {preview && scene.layers.length > 0 && (
              <div className="scene-preview-content" aria-hidden="true">
                <SceneCanvas
                  tv={{ ...previewTv, settings: { ...value, muted: true } }}
                  screenId={screenId}
                  now={now}
                  prayers={prayers}
                  posters={posters}
                  slide={0}
                  onImageError={() => {}}
                  livestream={livestream}
                />
              </div>
            )}
            {!scene.layers.length && (
              <button
                type="button"
                className="scene-empty"
                disabled={disabled}
                onClick={openAddContent}
              >
                <span aria-hidden="true">+</span>
                <strong>Add content</strong>
                <span>Posters, video, a camera or a shared screen</span>
              </button>
            )}
            {scene.layers.map((item, index) => (
              <div
                key={item.id}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-pressed={selected === item.id}
                aria-label={`${label(item)}, layer ${index + 1}. Arrow keys move. Shift and arrows resize.`}
                className={`scene-layer scene-edit-layer ${selected === item.id ? 'is-selected' : ''}`}
                style={{ ...layerStyle(item), zIndex: index + 1 }}
                onFocus={() => setSelected(item.id)}
                onPointerDown={(event) => begin(event, item)}
                onPointerMove={move}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onKeyDown={(event) => {
                  if (
                    disabled ||
                    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
                  )
                    return;
                  event.preventDefault();
                  const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
                  const amount = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
                  const key = event.shiftKey
                    ? horizontal
                      ? 'width'
                      : 'height'
                    : horizontal
                      ? 'x'
                      : 'y';
                  updateLayer({ ...item, ...fitRect({ ...item, [key]: item[key] + amount }) });
                }}
              >
                {['poster', 'poster-next'].includes(item.type) &&
                  posters.some((poster) => item.poster_ids?.includes(poster.id)) && (
                    <img
                      draggable="false"
                      alt=""
                      src={posters.find((poster) => item.poster_ids?.includes(poster.id))?.image}
                    />
                  )}
                <span>{label(item)}</span>
                {selected === item.id && (
                  <span
                    className="scene-resize"
                    aria-hidden="true"
                    onPointerDown={(event) => begin(event, item, true)}
                  >
                    ↘
                  </span>
                )}
              </div>
            ))}
          </div>
          {scene.layers.length > 0 && (
            <>
              <div className="scene-layer-list" aria-label="Select a source">
                {scene.layers.map((item) => (
                  <button
                    className={`admin-button ${item.id === selected ? 'primary' : ''}`}
                    type="button"
                    disabled={disabled}
                    aria-pressed={item.id === selected}
                    key={item.id}
                    onClick={() => setSelected(item.id)}
                  >
                    {label(item)}
                  </button>
                ))}
              </div>
              {!layer && <p>Select content on the preview to edit, change audio or remove it.</p>}
            </>
          )}
          <div className="scene-preview-options">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={preview}
                onChange={(event) => setPreview(event.target.checked)}
              />
              Preview live content
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                disabled={disabled}
                checked={scene.overlap}
                onChange={(event) => {
                  const next = { ...scene, overlap: event.target.checked };
                  if (!next.overlap && next.layers.some((item) => !canPlace(next, item))) {
                    setMessage('Move overlapping sources apart first.');
                    return;
                  }
                  setMessage('');
                  updateScene(next);
                }}
              />
              Allow overlap
            </label>
          </div>
          {previewTv.error && <p role="status">{previewTv.error}</p>}
          <p className="admin-tv-help">
            Present sends this layout to viewers. Preview sound is muted. Save camera or screen
            sources before starting them below.
          </p>
        </div>

        {layer && (
          <fieldset
            ref={properties}
            id={`${editorId}-properties`}
            tabIndex={-1}
            disabled={disabled}
            className="scene-properties"
          >
            <legend>Edit {label(layer)}</legend>
            {['poster', 'poster-next'].includes(layer.type) && (
              <>
                <p>Choose one poster to keep on screen, or several to rotate.</p>
                <a href="/admin?section=posters" target="_blank" rel="noreferrer">
                  Add or edit posters ↗
                </a>
                <div className="admin-poster-picker">
                  {posters.map((poster) => (
                    <label key={poster.id}>
                      <span>
                        {poster.kind === 'announcement' ? (
                          'Text & pictures'
                        ) : (
                          <img src={poster.image} alt="" loading="lazy" />
                        )}
                      </span>
                      <span>
                        <input
                          type="checkbox"
                          checked={(layer.poster_ids || []).includes(poster.id)}
                          onChange={(event) =>
                            updateLayer({
                              ...layer,
                              poster_ids: event.target.checked
                                ? [...(layer.poster_ids || []), poster.id]
                                : (layer.poster_ids || []).filter((id) => id !== poster.id),
                            })
                          }
                        />
                        {poster.title}
                      </span>
                    </label>
                  ))}
                </div>
                <label>
                  Seconds between posters
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={layer.rotation_seconds || 20}
                    onChange={(event) =>
                      updateLayer({ ...layer, rotation_seconds: Number(event.target.value) })
                    }
                  />
                </label>
              </>
            )}
            {['youtube', 'camera'].includes(layer.type) && (
              <label>
                {layer.type === 'youtube' ? 'YouTube link' : 'HTTPS camera stream'}
                <input
                  type="url"
                  value={layer.url}
                  onChange={(event) => updateLayer({ ...layer, url: event.target.value })}
                  placeholder={
                    layer.type === 'youtube'
                      ? 'https://www.youtube.com/watch?v=…'
                      : 'https://…/camera.m3u8'
                  }
                />
              </label>
            )}
            {layer.type === 'camera' && (
              <label>
                Camera format
                <select
                  value={layer.protocol}
                  onChange={(event) => updateLayer({ ...layer, protocol: event.target.value })}
                >
                  <option value="hls">HLS</option>
                  <option value="whep">WebRTC / WHEP</option>
                </select>
                <small>
                  Use the camera’s browser stream address. A local RTSP link cannot play here.
                </small>
              </label>
            )}
            {layer.type === 'input' && (
              <>
                <label>
                  Device name (required)
                  <input
                    value={layer.name || ''}
                    maxLength={60}
                    required
                    aria-invalid={!layer.name?.trim()}
                    aria-describedby={!layer.name?.trim() ? `${editorId}-rename-error` : undefined}
                    placeholder="e.g. Office laptop"
                    onChange={(event) =>
                      onChange(updateInputName(value, layer.slot, event.target.value))
                    }
                  />
                  {!layer.name?.trim() && (
                    <small
                      className="admin-field-error"
                      id={`${editorId}-rename-error`}
                      role="alert"
                    >
                      Enter a name for this device.
                    </small>
                  )}
                </label>
                <label>
                  Capture source
                  <select
                    value={layer.capture || ''}
                    onChange={(event) =>
                      onChange(updateInputCapture(value, layer.slot, event.target.value))
                    }
                  >
                    <option value="" disabled>
                      Choose a source
                    </option>
                    <option value="screen">Screen share from a laptop</option>
                    <option value="camera">Camera from a phone or laptop</option>
                  </select>
                  <small>
                    This name and source are reused in every scene. Stop sharing before changing the
                    source.
                  </small>
                </label>
                <label>
                  Saved device
                  <select
                    value={layer.slot}
                    onChange={(event) => {
                      const slot = event.target.value;
                      const existing = deviceSources.find((item) => item.slot === slot);
                      const name = existing?.name || layer.name;
                      const nextCapture = existing?.capture || layer.capture;
                      const updated = settingsWithScene({
                        ...scene,
                        layers: scene.layers.map((item) =>
                          item.id === layer.id
                            ? { ...layer, slot, name, capture: nextCapture }
                            : item,
                        ),
                      });
                      onChange(
                        nextCapture ? updateInputCapture(updated, slot, nextCapture) : updated,
                      );
                    }}
                  >
                    {INPUT_SLOTS.map((slot, index) => (
                      <option
                        key={slot}
                        disabled={scene.layers.some(
                          (item) =>
                            item.id !== layer.id && item.type === 'input' && item.slot === slot,
                        )}
                        value={slot}
                      >
                        {deviceSources.some((item) => item.slot === slot)
                          ? inputLabel(deviceSources.find((item) => item.slot === slot))
                          : `New device ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {layer.type === 'text' && (
              <label>
                Message
                <textarea
                  rows={4}
                  maxLength={1200}
                  value={layer.text}
                  onChange={(event) => updateLayer({ ...layer, text: event.target.value })}
                />
              </label>
            )}
            {layer.type === 'schedule' && (
              <p>Shows the live video saved in the website’s livestream settings.</p>
            )}
            <h4>Position and size</h4>
            <div className="scene-dimensions">
              {[
                ['x', 'Left %'],
                ['y', 'Top %'],
                ['width', 'Width %'],
                ['height', 'Height %'],
              ].map(([key, name]) => (
                <label key={key}>
                  {name}
                  <input
                    type="number"
                    min={key === 'width' || key === 'height' ? 5 : 0}
                    max="100"
                    step="1"
                    value={Number(layer[key].toFixed(1))}
                    onChange={(event) => resizeNumber(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="scene-action-row">
              <button
                type="button"
                className="admin-button"
                disabled={scene.layers.at(-1)?.id === layer.id}
                onClick={() =>
                  updateScene({
                    ...scene,
                    layers: [...scene.layers.filter((item) => item.id !== layer.id), layer],
                  })
                }
              >
                Bring to front
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={scene.layers[0]?.id === layer.id}
                onClick={() =>
                  updateScene({
                    ...scene,
                    layers: [layer, ...scene.layers.filter((item) => item.id !== layer.id)],
                  })
                }
              >
                Send to back
              </button>
            </div>
          </fieldset>
        )}
      </div>

      <details className="scene-settings">
        <summary>Scene settings</summary>
        <label>
          Scene name
          <input
            value={scene.name}
            maxLength={60}
            required
            disabled={disabled}
            onChange={(event) => updateScene({ ...scene, name: event.target.value })}
          />
        </label>
        <div className="scene-action-row">
          <button
            type="button"
            className="admin-button"
            disabled={disabled || !scene.layers.length}
            onClick={() => {
              if (
                !window.confirm(
                  `Clear all content from “${scene.name}”? Other scenes are kept. Presenting an empty scene returns the stream to Normal.`,
                )
              )
                return;
              updateScene({ ...scene, layers: [] });
              setSelected('');
              setMessage('');
            }}
          >
            Clear scene
          </button>
          <button
            className="admin-button"
            type="button"
            disabled={disabled || value.scenes.length === 1}
            onClick={() => {
              if (!window.confirm(`Remove “${scene.name}” and its layout? Other scenes are kept.`))
                return;
              const scenes = value.scenes.filter((item) => item.id !== scene.id);
              onChange({ ...value, scenes, active_scene_id: scenes[0].id });
              setSelected('');
              setAdding(false);
              setMessage('');
            }}
          >
            Remove scene
          </button>
        </div>
      </details>
    </section>
  );
}
