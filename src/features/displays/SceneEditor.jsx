import React, { useEffect, useRef, useState } from 'react';
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
import { availableInputSlot, updateInputCapture } from '@/lib/tvSceneState';

const uid = () => crypto.randomUUID();
const label = (layer) =>
  layer.type === 'input'
    ? layer.capture === 'camera'
      ? 'Device camera'
      : layer.capture === 'screen'
        ? 'Screen share'
        : 'Device input'
    : SOURCE_TYPES.find(([id]) => id === layer.type)?.[1] || layer.type;
export default function SceneEditor({ value, onChange, disabled, posters = [], screenId }) {
  const prayers = usePrayerTimes();
  const { livestream } = useHomeLiveContent();
  const [preview, setPreview] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [preview]);
  const scene = value.scenes.find((s) => s.id === value.active_scene_id) || value.scenes[0];
  const [selected, setSelected] = useState('');
  const [source, setSource] = useState('poster');
  const [message, setMessage] = useState('');
  const canvas = useRef(null);
  const drag = useRef(null);
  const layer = scene.layers.find((item) => item.id === selected);
  function settingsWithScene(next) {
    return { ...value, scenes: value.scenes.map((s) => (s.id === scene.id ? next : s)) };
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
    updateScene({ ...scene, layers: scene.layers.map((l) => (l.id === next.id ? next : l)) });
  }
  function addSource() {
    if (scene.layers.length >= MAX_LAYERS) return;
    const next = {
      id: uid(),
      type: source.startsWith('input-') ? 'input' : source,
      x: 10,
      y: 15,
      width: 50,
      height: 50,
    };
    if (['youtube', 'camera', 'schedule', 'input'].includes(source)) next.audio = false;
    if (['youtube', 'camera'].includes(source)) next.url = '';
    if (source === 'camera') next.protocol = 'hls';
    if (next.type === 'input') {
      next.audio = false;
      next.capture = source === 'input-camera' ? 'camera' : 'screen';
      next.slot = availableInputSlot(value, next.capture);
      if (!next.slot) {
        setMessage(
          'All four device inputs are in use. Remove an input or reuse one with the same source type.',
        );
        return;
      }
    }
    if (source === 'text') next.text = '';
    if (source === 'poster') Object.assign(next, { poster_ids: [], rotation_seconds: 20 });
    if (['times', 'next', 'clock'].includes(source))
      Object.assign(next, {
        y: 0,
        height: source === 'times' ? 18 : 10,
        width: source === 'clock' ? 25 : 100,
        x: 0,
      });
    if (!canPlace(scene, next)) {
      setMessage('Enable overlap to add here, then move the source.');
      return;
    }
    const updated = settingsWithScene({ ...scene, layers: [...scene.layers, next] });
    onChange(
      next.type === 'input' ? updateInputCapture(updated, next.slot, next.capture) : updated,
    );
    setSelected(next.id);
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
    const dx = ((event.clientX - start.startX) / start.width) * 100,
      dy = ((event.clientY - start.startY) / start.height) * 100;
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
  function setCount(count) {
    let scenes = [...value.scenes];
    while (scenes.length < count) scenes.push(newScene(uid(), `Scene ${scenes.length + 1}`));
    onChange({ ...value, scenes, active_scene_id: scenes.at(-1).id });
    setSelected('');
  }
  return (
    <section className="admin-panel scene-editor">
      <h3>Scenes</h3>
      <div className="admin-actions" aria-label="Scenes">
        <button
          type="button"
          className="admin-button"
          disabled={disabled || !scene.layers.length}
          onClick={() => {
            if (
              !window.confirm(
                'Clear this scene? Saving an empty scene returns the TV to Normal. Other scenes are kept.',
              )
            )
              return;
            updateScene({ ...scene, layers: [] });
            setSelected('');
          }}
        >
          Clear scene
        </button>
        {value.scenes.map((s, i) => (
          <button
            type="button"
            key={s.id}
            disabled={disabled}
            className={`admin-button ${s.id === scene.id ? 'primary' : ''}`}
            aria-pressed={s.id === scene.id}
            onClick={() => {
              onChange({ ...value, active_scene_id: s.id });
              setSelected('');
            }}
          >
            {i + 1}. {s.name}
          </button>
        ))}
        <button
          type="button"
          className="admin-button"
          disabled={disabled || value.scenes.length >= MAX_SCENES}
          onClick={() => setCount(value.scenes.length + 1)}
        >
          + Scene
        </button>
      </div>
      <p>
        Choose sources, drag them into place and resize using a corner. Save to show this scene on
        the TV.
      </p>
      <div className="scene-toolbar">
        <label>
          Scene name
          <input
            value={scene.name}
            maxLength={60}
            disabled={disabled}
            onChange={(e) => updateScene({ ...scene, name: e.target.value })}
          />
        </label>
        <label>
          Source
          <select disabled={disabled} value={source} onChange={(e) => setSource(e.target.value)}>
            {[
              ...SOURCE_TYPES.filter(([id]) => !['schedule', 'input'].includes(id)),
              ['input-screen', 'Screen share (laptop)'],
              ['input-camera', 'Camera from this device'],
            ].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="admin-button"
          disabled={disabled || scene.layers.length >= MAX_LAYERS}
          onClick={addSource}
        >
          + Add source
        </button>
      </div>
      <label className="admin-check">
        <input
          type="checkbox"
          disabled={disabled}
          checked={scene.overlap}
          onChange={(e) => {
            const next = { ...scene, overlap: e.target.checked };
            if (!next.overlap && next.layers.some((l) => !canPlace(next, l))) {
              setMessage('Move overlapping sources apart first.');
              return;
            }
            setMessage('');
            updateScene(next);
          }}
        />
        Allow sources to overlap
      </label>
      <div
        ref={canvas}
        className="scene-canvas scene-edit-canvas"
        aria-label="Landscape scene, 16 by 9"
      >
        {scene.layers.map((item, index) => (
          <div
            key={item.id}
            tabIndex={disabled ? -1 : 0}
            role="button"
            aria-label={`${label(item)}, layer ${index + 1}. Arrow keys move. Shift and arrows resize.`}
            className={`scene-layer scene-edit-layer ${selected === item.id ? 'is-selected' : ''}`}
            style={{ ...layerStyle(item), zIndex: index + 1 }}
            onFocus={() => setSelected(item.id)}
            onPointerDown={(e) => begin(e, item)}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onKeyDown={(e) => {
              if (disabled || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
                return;
              e.preventDefault();
              const horizontal = ['ArrowLeft', 'ArrowRight'].includes(e.key),
                amount = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
              const key = e.shiftKey ? (horizontal ? 'width' : 'height') : horizontal ? 'x' : 'y';
              updateLayer({ ...item, ...fitRect({ ...item, [key]: item[key] + amount }) });
            }}
          >
            {['poster', 'poster-next'].includes(item.type) &&
              posters.some((p) => item.poster_ids?.includes(p.id)) && (
                <img
                  draggable="false"
                  alt=""
                  src={posters.find((p) => item.poster_ids?.includes(p.id))?.image}
                />
              )}
            <span>
              {label(item)}
              {item.type === 'input' ? ` · ${item.slot.replace('input-', 'Input ')}` : ''}
            </span>
            {selected === item.id && (
              <span
                className="scene-resize"
                aria-hidden="true"
                onPointerDown={(e) => begin(e, item, true)}
              >
                ↘
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="admin-tv-help">
        This is the layout preview. Open “View TV” for the saved live picture. Layers later in the
        list appear on top.
      </p>
      {!scene.layers.length && (
        <p>
          Add a source to build this scene. If you save it empty, the TV returns to Normal. Your
          other scenes are kept.
        </p>
      )}
      <button type="button" className="admin-button" onClick={() => setPreview(!preview)}>
        {preview ? 'Close draft preview' : 'Preview draft'}
      </button>
      {preview && (
        <>
          <p>
            Unsaved preview: posters, YouTube, text and times. Private device feeds appear in View
            TV after saving and starting the input.
          </p>
          <SceneCanvas
            tv={{ settings: { ...value, muted: true }, paired: false }}
            screenId={screenId}
            now={now}
            prayers={prayers}
            posters={posters}
            slide={0}
            onImageError={() => {}}
            livestream={livestream}
          />
        </>
      )}
      <div className="scene-layer-list" aria-label="Select a source">
        {scene.layers.map((item) => (
          <button
            className={`admin-button ${item.id === selected ? 'primary' : ''}`}
            type="button"
            disabled={disabled}
            key={item.id}
            onClick={() => setSelected(item.id)}
          >
            {label(item)}
          </button>
        ))}
      </div>
      {layer && (
        <fieldset disabled={disabled} className="scene-properties">
          <legend>{label(layer)}</legend>
          {['poster', 'poster-next'].includes(layer.type) && (
            <>
              <h4>Choose posters</h4>
              <p>Tick one picture to keep it on screen, or several to rotate.</p>
              <a href="/admin?section=posters" target="_blank" rel="noreferrer">
                Edit / add posters ↗
              </a>
              <div className="admin-poster-picker">
                {posters.map((p) => (
                  <label key={p.id}>
                    <span>
                      {p.kind === 'announcement' ? (
                        'Text & pictures'
                      ) : (
                        <img src={p.image} alt="" loading="lazy" />
                      )}
                    </span>
                    <span>
                      <input
                        type="checkbox"
                        checked={(layer.poster_ids || []).includes(p.id)}
                        onChange={(e) =>
                          updateLayer({
                            ...layer,
                            poster_ids: e.target.checked
                              ? [...(layer.poster_ids || []), p.id]
                              : layer.poster_ids.filter((id) => id !== p.id),
                          })
                        }
                      />
                      {p.title}
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
                  onChange={(e) =>
                    updateLayer({ ...layer, rotation_seconds: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}
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
                  onChange={(e) => resizeNumber(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          {['youtube', 'camera'].includes(layer.type) && (
            <label>
              {layer.type === 'youtube' ? 'YouTube link' : 'HTTPS camera stream'}
              <input
                type="url"
                value={layer.url}
                onChange={(e) => updateLayer({ ...layer, url: e.target.value })}
                placeholder={
                  layer.type === 'youtube'
                    ? 'https://www.youtube.com/watch?v=…'
                    : 'https://…/camera.m3u8'
                }
              />
            </label>
          )}
          {layer.type === 'camera' && (
            <>
              <label>
                Camera format
                <select
                  value={layer.protocol}
                  onChange={(e) => updateLayer({ ...layer, protocol: e.target.value })}
                >
                  <option value="hls">HLS</option>
                  <option value="whep">WebRTC / WHEP</option>
                </select>
              </label>
              <p>A local RTSP address needs a browser stream from a relay on the mosque network.</p>
            </>
          )}
          {layer.type === 'input' && (
            <>
              <label>
                Capture source
                <select
                  value={layer.capture || ''}
                  onChange={(e) => onChange(updateInputCapture(value, layer.slot, e.target.value))}
                >
                  <option value="" disabled>
                    Choose a source
                  </option>
                  <option value="screen">Screen share from a laptop</option>
                  <option value="camera">Camera from a phone or laptop</option>
                </select>
              </label>
              <p>
                This source type applies to {layer.slot.replace('input-', 'Input ')} in every scene.
                Stop a running input before changing its source.
              </p>
              <label>
                Device input
                <select
                  value={layer.slot}
                  onChange={(e) => {
                    const slot = e.target.value;
                    const updated = settingsWithScene({
                      ...scene,
                      layers: scene.layers.map((l) => (l.id === layer.id ? { ...layer, slot } : l)),
                    });
                    onChange(
                      layer.capture ? updateInputCapture(updated, slot, layer.capture) : updated,
                    );
                  }}
                >
                  {INPUT_SLOTS.map((slot, i) => (
                    <option
                      key={slot}
                      disabled={scene.layers.some(
                        (l) => l.id !== layer.id && l.type === 'input' && l.slot === slot,
                      )}
                      value={slot}
                    >
                      Input {i + 1}
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
                rows={3}
                maxLength={1200}
                value={layer.text}
                onChange={(e) => updateLayer({ ...layer, text: e.target.value })}
              />
            </label>
          )}
          {'audio' in layer && (
            <label className="admin-check">
              <input
                type="checkbox"
                checked={layer.audio}
                onChange={(e) => updateLayer({ ...layer, audio: e.target.checked })}
              />
              Play this source’s audio
            </label>
          )}
          <div className="admin-actions">
            <button
              type="button"
              className="admin-button"
              onClick={() =>
                updateScene({
                  ...scene,
                  layers: [...scene.layers.filter((l) => l.id !== layer.id), layer],
                })
              }
            >
              Bring to front
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() =>
                updateScene({
                  ...scene,
                  layers: [layer, ...scene.layers.filter((l) => l.id !== layer.id)],
                })
              }
            >
              Send to back
            </button>
            <button
              type="button"
              className="admin-button"
              onClick={() => {
                updateScene({ ...scene, layers: scene.layers.filter((l) => l.id !== layer.id) });
                setSelected('');
              }}
            >
              Remove source
            </button>
          </div>
        </fieldset>
      )}
      {message && <p role="status">{message}</p>}
      <button
        className="admin-button"
        type="button"
        disabled={disabled || value.scenes.length === 1}
        onClick={() => {
          const scenes = value.scenes.filter((s) => s.id !== scene.id);
          onChange({ ...value, scenes, active_scene_id: scenes[0].id });
          setSelected('');
        }}
      >
        Remove this scene
      </button>
    </section>
  );
}
