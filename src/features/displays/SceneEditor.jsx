import React, { useEffect, useId, useState } from 'react';
import { Plus, Settings2, Link2 } from 'lucide-react';
import {
  SOURCE_TYPES,
  MAX_SCENES,
  layerStyle,
} from '../../../supabase/functions/_shared/tv-scenes.js';
import SceneCanvas from './SceneCanvas';
import LayoutCanvas from './LayoutCanvas';
import useSceneHistory from './useSceneHistory';
import { usePrayerTimes } from '@/components/sections/prayer-times/PrayerTimesLogic';
import useHomeLiveContent from '@/hooks/useHomeLiveContent';
import useTvPreview from '@/hooks/useTvPreview';
import { inputLabel } from '@/lib/tvSceneState';
import ContentEditorDialog from './ContentEditorDialog';
import { SCENE_LAYOUTS, arrangeScene, clearRegion, layoutRegions } from '@/lib/sceneLayouts';
import { addStreamScene } from '@/lib/streamWorkspace';
import { isSingleInputPresentation } from '@/lib/presentationMode';

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
  initialMode = 'simple',
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
  const [showConnection, setShowConnection] = useState(false);
  const history = useSceneHistory(screenId);
  const [requestedMode, setRequestedMode] = useState(initialMode);
  const simpleAvailable = isSingleInputPresentation(value);
  const advanced = requestedMode === 'advanced' || !simpleAvailable;
  const layer =
    scene.layers.find((item) => item.id === selected) || (!advanced ? scene.layers[0] : null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelected('');
    setEditing(null);
    setShowConnection(false);
  }, [scene.id]);

  const snapshot = () => ({ scenes: value.scenes, active_scene_id: value.active_scene_id });
  const checkpoint = () => history.checkpoint(snapshot());
  const restore = (saved) => onChange({ ...value, ...saved });

  function change(next) {
    if (disabled) return;
    if (
      JSON.stringify(snapshot()) !==
      JSON.stringify({ scenes: next.scenes, active_scene_id: next.active_scene_id })
    ) {
      checkpoint();
    }
    onChange(next);
  }

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

  function edit(item, connection = false) {
    if (disabled) return;
    setSelected(item.id);
    setShowConnection(connection);
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
    checkpoint();
    updateScene(arrangeScene(scene, count, preset));
    setSelected('');
  }

  function reorder(front) {
    checkpoint();
    const remaining = scene.layers.filter((item) => item.id !== layer.id);
    updateScene({ ...scene, layers: front ? [...remaining, layer] : [layer, ...remaining] });
  }

  function removeInput() {
    if (disabled || !layer) return;
    checkpoint();
    updateScene({
      ...scene,
      layers:
        scene.layers.length === 1
          ? [clearRegion(layer)]
          : scene.layers.filter((item) => item.id !== layer.id),
    });
    setSelected('');
    closeDialog();
  }

  function selectInput(id) {
    if (disabled) return;
    const item = scene.layers.find((candidate) => candidate.id === id);
    if (!item) return;
    setSelected(id);
    if (!advanced) edit(item);
  }

  return (
    <section className="admin-panel scene-editor" aria-labelledby={`${editorId}-heading`}>
      <div className="scene-heading">
        <div>
          <h3 id={`${editorId}-heading`}>
            <span className="jic-prompt">
              {advanced ? 'Arrange your scene' : 'Present one input'}
            </span>
          </h3>
          <p>
            {advanced
              ? 'Tap an input to select it. Drag it to move; use the corners to resize.'
              : 'Select one input, connect your device, then press Start presenting.'}
          </p>
        </div>
        <span className="scene-count">Preview</span>
      </div>
      <div className="scene-toolbar">
        <label>
          Presentation mode
          <select
            value={advanced ? 'advanced' : 'simple'}
            disabled={disabled}
            onChange={(event) => {
              setRequestedMode(event.target.value);
              setSelected('');
            }}
          >
            <option value="simple" disabled={!simpleAvailable}>
              Simple · one input
            </option>
            <option value="advanced">Advanced · scenes and layouts</option>
          </select>
        </label>
      </div>
      <div hidden={!advanced}>
        <div className="scene-management">
          <button
            type="button"
            className="admin-button"
            disabled={disabled || value.scenes.length >= MAX_SCENES}
            onClick={() => {
              change(addStreamScene(value));
              setSelected('');
              closeDialog();
            }}
          >
            <Plus size={18} aria-hidden="true" /> Add scene
          </button>
          {value.scenes.length > 1 && (
            <button
              type="button"
              className="admin-button"
              disabled={disabled}
              onClick={() => {
                if (!window.confirm('Remove this scene and its inputs from this setup?')) return;
                const scenes = value.scenes.filter((item) => item.id !== scene.id);
                change({ ...value, scenes, active_scene_id: scenes[0].id });
                setSelected('');
                closeDialog();
              }}
            >
              Remove scene
            </button>
          )}
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
                  Scene {index + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="jic-prompt">How many inputs?</span>
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
      </div>
      <div className="scene-preview-column">
        <div className="scene-toolbar" aria-label="Layout controls">
          {advanced && scene.layers.length > 0 && (
            <label>
              Input to edit
              <select
                value={selected}
                disabled={disabled}
                onChange={(event) => selectInput(event.target.value)}
              >
                <option value="">Tap an input or choose here</option>
                {scene.layers.map((item, index) => (
                  <option key={item.id} value={item.id}>
                    Input {index + 1}: {sourceLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="admin-button"
            disabled={disabled || !history.canUndo}
            onClick={() => history.undo(snapshot(), restore)}
          >
            Undo
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={disabled || !history.canRedo}
            onClick={() => history.redo(snapshot(), restore)}
          >
            Redo
          </button>
        </div>
        <LayoutCanvas
          key={`${screenId}:${scene.id}:${value.display_orientation}`}
          layers={scene.layers}
          selectedId={advanced ? selected : ''}
          onSelect={selectInput}
          onEdit={edit}
          onChange={updateLayer}
          onCheckpoint={checkpoint}
          orientation={value.display_orientation}
          disabled={disabled}
          snap={snap}
          labelFor={(item, index) => `Input ${index + 1}: ${sourceLabel(item)}`}
        >
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
        </LayoutCanvas>
        <div className="scene-editor-footer">
          {advanced && (
            <label className="admin-check">
              <input
                type="checkbox"
                checked={snap}
                disabled={disabled}
                onChange={(event) => setSnap(event.target.checked)}
              />
              Snap to grid
            </label>
          )}
          <small>
            {advanced
              ? 'Tap a selected input again to edit it. Preview sound is muted.'
              : 'Preview sound is muted.'}
          </small>
        </div>
        {layer && (advanced || layer.type !== 'empty') && (
          <div className="scene-selected-source" aria-label="Selected input controls">
            <strong>
              <span className="jic-prompt">Selected input:</span> {sourceLabel(layer)}
            </strong>
            <div className="scene-source-actions">
              {layer.type === 'input' && (
                <button
                  type="button"
                  className="admin-button primary"
                  disabled={disabled}
                  onClick={() => edit(layer, true)}
                >
                  <Link2 size={18} aria-hidden="true" />
                  {localStreams[layer.slot] ? 'Sharing controls' : 'Connect device'}
                </button>
              )}
              <button
                type="button"
                className={`admin-button ${layer.type === 'empty' ? 'primary' : ''}`}
                disabled={disabled}
                onClick={() => edit(layer)}
              >
                {layer.type !== 'empty' && <Settings2 size={18} aria-hidden="true" />}
                {layer.type === 'empty' ? 'Select input type' : 'Edit input'}
              </button>
              {advanced && (
                <>
                  <button
                    type="button"
                    className="admin-button"
                    disabled={disabled || scene.layers.at(-1)?.id === layer.id}
                    onClick={() => reorder(true)}
                  >
                    Bring forward
                  </button>
                  <button
                    type="button"
                    className="admin-button"
                    disabled={disabled || scene.layers[0]?.id === layer.id}
                    onClick={() => reorder(false)}
                  >
                    Send back
                  </button>
                </>
              )}
              {(layer.type !== 'empty' || scene.layers.length > 1) && (
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled}
                  onClick={removeInput}
                >
                  Remove input
                </button>
              )}
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
          onChange={change}
          disabled={disabled}
          posters={posters}
          renderDeviceInput={renderDeviceInput}
          showConnection={showConnection}
          onClose={closeDialog}
        />
      )}
    </section>
  );
}
