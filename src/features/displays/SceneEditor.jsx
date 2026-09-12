import React, { useEffect, useId, useRef, useState } from 'react';
import {
  SOURCE_TYPES,
  fitRect,
  layerStyle,
} from '../../../supabase/functions/_shared/tv-scenes.js';
import SceneCanvas from './SceneCanvas';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import useTvPreview from '@/hooks/useTvPreview';
import { inputLabel } from '@/lib/tvSceneState';
import ContentEditorDialog from './ContentEditorDialog';
import { SCENE_LAYOUTS, arrangeScene, layoutRegions, snapRect } from '@/lib/sceneLayouts';

const sourceLabel = (layer) =>
  layer.type === 'empty'
    ? 'Select input type'
    : layer.type === 'input'
      ? inputLabel(layer)
      : SOURCE_TYPES.find(([type]) => type === layer.type)?.[1] || 'Posters';
export default function SceneEditor({
  value,
  onChange,
  disabled,
  posters = [],
  screenId,
  renderDeviceInput,
  localStreams = {},
  previewLive = false,
}) {
  const editorId = useId();
  const prayers = usePrayerTimes();
  const { livestream } = useHomeLiveContent();
  const scene = value.scenes.find((item) => item.id === value.active_scene_id) || value.scenes[0];
  const previewTv = useTvPreview(
    screenId,
    previewLive && scene.layers.some((item) => ['input', 'camera'].includes(item.type)),
  );
  const [now, setNow] = useState(() => new Date());
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState(null);
  const [snap, setSnap] = useState(true);
  const canvas = useRef(null);
  const drag = useRef(null);
  const layer = scene.layers.find((item) => item.id === selected);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function updateScene(next) {
    onChange({
      ...value,
      scenes: value.scenes.map((item) =>
        item.id === scene.id ? { ...next, overlap: true } : item,
      ),
    });
  }

  function updateLayer(next) {
    updateScene({
      ...scene,
      layers: scene.layers.map((item) => (item.id === next.id ? next : item)),
    });
  }

  function closeDialog() {
    setEditing(null);
  }

  function edit(item) {
    if (disabled) return;
    setSelected(item.id);
    setEditing({ ...item });
  }

  function applyLayout(count, preset) {
    if (
      count < scene.layers.length &&
      scene.layers.slice(count).some((item) => item.type !== 'empty') &&
      !window.confirm(
        `Keep the first ${count} ${count === 1 ? 'input' : 'inputs'} and remove the remaining content from this scene?`,
      )
    )
      return;
    updateScene(arrangeScene(scene, count, preset));
    setSelected('');
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
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event) {
    const start = drag.current;
    if (!start) return;
    const pixelsX = event.clientX - start.startX;
    const pixelsY = event.clientY - start.startY;
    if (!start.moved && Math.hypot(pixelsX, pixelsY) < 5) return;
    start.moved = true;
    const dx = (pixelsX / start.width) * 100;
    const dy = (pixelsY / start.height) * 100;
    const next = {
      ...start.item,
      ...(start.resize
        ? {
            width: Math.min(start.item.width + dx, 100 - start.item.x),
            height: Math.min(start.item.height + dy, 100 - start.item.y),
          }
        : { x: start.item.x + dx, y: start.item.y + dy }),
    };
    const rect = snap
      ? snapRect(
          next,
          scene.layers.filter((item) => item.id !== next.id),
          { resize: start.resize },
        )
      : fitRect(next);
    updateLayer({ ...next, ...rect });
  }

  function finish(event, item) {
    event.stopPropagation();
    const start = drag.current;
    drag.current = null;
    if (start && !start.moved && !start.resize) edit(item);
  }

  function reorder(front) {
    const remaining = scene.layers.filter((item) => item.id !== layer.id);
    updateScene({ ...scene, layers: front ? [...remaining, layer] : [layer, ...remaining] });
  }

  return (
    <section className="admin-panel scene-editor" aria-labelledby={`${editorId}-heading`}>
      <div className="scene-heading">
        <div>
          <h3 id={`${editorId}-heading`}>Arrange your scene</h3>
          <p>Choose how many inputs, then tap each + to select its type. Drag to move or resize.</p>
        </div>
        <span className="scene-count">Draft preview</span>
      </div>
      <div className="scene-toolbar">
        <label>
          Scene
          <select
            disabled={disabled}
            value={scene.id}
            onChange={(event) => {
              onChange({ ...value, active_scene_id: event.target.value });
              setSelected('');
              closeDialog();
            }}
          >
            {value.scenes.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}. {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Scene name
          <input
            disabled={disabled}
            maxLength={60}
            value={scene.name}
            onChange={(event) => updateScene({ ...scene, name: event.target.value })}
          />
        </label>
        <label>
          How many inputs?
          <select
            disabled={disabled}
            value={scene.layers.length}
            onChange={(event) => applyLayout(Number(event.target.value), 'columns')}
          >
            {!scene.layers.length && <option value="0">Choose a number</option>}
            {[1, 2, 3, 4].map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? 'input' : 'inputs'}
              </option>
            ))}
            {scene.layers.length > 4 && (
              <option value={scene.layers.length}>{scene.layers.length} saved inputs</option>
            )}
          </select>
        </label>
      </div>
      {scene.layers.length > 1 && scene.layers.length <= 4 && (
        <fieldset className="scene-layout-options" disabled={disabled}>
          <legend>Choose an arrangement</legend>
          {SCENE_LAYOUTS.map(([preset, name]) => (
            <button
              type="button"
              className="admin-button scene-layout-preset"
              key={preset}
              onClick={() => applyLayout(scene.layers.length, preset)}
            >
              <span className="scene-layout-miniature" aria-hidden="true">
                {layoutRegions(scene.layers.length, preset).map((rect, index) => (
                  <span key={index} style={layerStyle(rect)} />
                ))}
              </span>
              <span>{name}</span>
            </button>
          ))}
        </fieldset>
      )}
      <div className="scene-preview-column">
        <div
          ref={canvas}
          className="scene-canvas scene-edit-canvas has-preview"
          aria-label="Scene preview, 16 by 9"
        >
          <div className="scene-preview-content" aria-hidden="true">
            <SceneCanvas
              preview
              tv={{ ...previewTv, settings: { ...value, muted: true } }}
              screenId={screenId}
              now={now}
              prayers={prayers}
              posters={posters}
              slide={0}
              onImageError={() => {}}
              livestream={livestream}
              localStreams={localStreams}
            />
          </div>
          {!scene.layers.length && (
            <div className="scene-empty">
              <strong>Choose how many inputs you need above</strong>
              <span>Your blank layout will appear here.</span>
            </div>
          )}
          {scene.layers.map((item, index) => (
            <div
              key={item.id}
              tabIndex={disabled ? -1 : 0}
              role="button"
              aria-pressed={selected === item.id}
              aria-label={`Input ${index + 1}: ${sourceLabel(item)}. Press Enter to edit; arrow keys move; Shift and arrows resize.`}
              className={`scene-layer scene-edit-layer ${item.type === 'empty' ? 'is-empty' : ''} ${selected === item.id ? 'is-selected' : ''}`}
              style={{ ...layerStyle(item), zIndex: index + 1 }}
              onPointerDown={(event) => begin(event, item)}
              onPointerMove={move}
              onPointerUp={(event) => finish(event, item)}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onFocus={() => setSelected(item.id)}
              onKeyDown={(event) => {
                if (disabled) return;
                if (['Enter', ' '].includes(event.key)) {
                  event.preventDefault();
                  edit(item);
                  return;
                }
                if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))
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
              <span className={item.type === 'empty' ? 'scene-add-area' : 'scene-area-label'}>
                {item.type === 'empty' && <b aria-hidden="true">+</b>}
                {sourceLabel(item)}
              </span>
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
        <div className="scene-editor-footer">
          <label className="admin-check">
            <input
              type="checkbox"
              checked={snap}
              onChange={(event) => setSnap(event.target.checked)}
            />
            Snap to edges and grid
          </label>
          <small>Inputs can overlap. Preview sound is muted.</small>
        </div>
        {layer && (
          <div className="scene-selected-source" aria-label="Selected input controls">
            <strong>{sourceLabel(layer)}</strong>
            <div className="scene-source-actions">
              <button
                type="button"
                className="admin-button"
                disabled={disabled}
                onClick={() => edit(layer)}
              >
                {layer.type === 'empty' ? 'Select input type' : 'Edit content'}
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={disabled}
                onClick={() => reorder(true)}
              >
                Bring forward
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={disabled}
                onClick={() => reorder(false)}
              >
                Send back
              </button>
            </div>
          </div>
        )}
      </div>
      {editing && (
        <ContentEditorDialog
          key={`${scene.id}-${editing.id}`}
          area={editing}
          scene={scene}
          value={value}
          onChange={onChange}
          disabled={disabled}
          posters={posters}
          renderDeviceInput={renderDeviceInput}
          onClose={closeDialog}
        />
      )}
    </section>
  );
}
