import React, { useEffect, useId, useRef, useState } from 'react';
import {
  INPUT_SLOTS,
  fitRect,
  nameProblem,
} from '../../../supabase/functions/_shared/tv-scenes.js';
import { secureStreamUrl, youtubeUrl } from '../../../supabase/functions/_shared/tv.js';
import {
  updateInputCapture,
  updateInputName,
  inputLabel,
  tvInputSources,
} from '@/lib/tvSceneState';
import { clearRegion } from '@/lib/sceneLayouts';

const contentTypes = [
  ['input-screen', 'Screen share'],
  ['input-camera', 'Device camera'],
  ['camera', 'CCTV'],
  ['youtube', 'YouTube link'],
  ['video', 'Saved video'],
  ['poster', 'Posters'],
  ['times', 'Prayer timetable'],
  ['next', 'Next prayer'],
  ['clock', 'Clock'],
  ['text', 'Text notice'],
];
const typeOf = (layer) =>
  layer.type === 'input' ? `input-${layer.capture || 'camera'}` : layer.type;
const defaultName = (capture, slot) =>
  `${capture === 'camera' ? 'Camera' : 'Screen'} ${INPUT_SLOTS.indexOf(slot) + 1}`;

export default function ContentEditorDialog({
  area,
  scene,
  value,
  onChange,
  disabled,
  posters,
  renderDeviceInput,
  onClose,
}) {
  const editorId = useId();
  const [draft, setDraft] = useState(() => ({ ...area }));
  const [errors, setErrors] = useState({});
  const [savedInput, setSavedInput] = useState(area.type === 'input');
  const dialog = useRef(null);
  const form = useRef(null);
  const sharing = useRef(null);
  const deviceSources = tvInputSources(value);
  const layer = scene.layers.find((item) => item.id === area.id);
  const closeDialog = onClose;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  useEffect(() => {
    if (savedInput) sharing.current?.scrollIntoView({ block: 'nearest' });
  }, [savedInput]);

  function updateLayer(next) {
    onChange({
      ...value,
      scenes: value.scenes.map((item) =>
        item.id === scene.id
          ? {
              ...scene,
              overlap: true,
              layers: scene.layers.map((layer) => (layer.id === next.id ? next : layer)),
            }
          : item,
      ),
    });
  }

  function changeDraft(next) {
    setDraft(next);
    setSavedInput(false);
    setErrors({});
  }

  function chooseContent(type) {
    if (!draft) return;
    const next = { ...clearRegion(draft), type };
    if (type.startsWith('input-')) {
      next.type = 'input';
      next.capture = type === 'input-screen' ? 'screen' : 'camera';
      const available = INPUT_SLOTS.filter(
        (slot) =>
          !scene.layers.some(
            (item) => item.id !== draft.id && item.type === 'input' && item.slot === slot,
          ),
      );
      const same = draft.type === 'input' && draft.capture === next.capture ? draft : null;
      const unused = available.find((slot) => !deviceSources.some((item) => item.slot === slot));
      const reused = deviceSources.find(
        (item) => available.includes(item.slot) && item.capture === next.capture,
      );
      next.slot = same?.slot || unused || reused?.slot;
      if (!next.slot) {
        setErrors({
          type: 'All four device inputs are in use. Reuse a camera or screen already added to this scene.',
        });
        return;
      }
      next.name = same?.name || (!unused && reused?.name) || '';
    }
    if (['youtube', 'video', 'camera', 'input', 'schedule'].includes(next.type)) next.audio = false;
    if (['youtube', 'video', 'camera'].includes(next.type)) next.url = '';
    if (next.type === 'camera') next.protocol = 'hls';
    if (next.type === 'poster') Object.assign(next, { poster_ids: [], rotation_seconds: 20 });
    if (next.type === 'text') next.text = '';
    changeDraft(next);
  }

  function saveContent(event) {
    event.preventDefault();
    if (disabled || !draft) return;
    const next = { ...draft };
    const invalid = {};
    if (next.type === 'empty') invalid.type = 'Select an input type.';
    if (['youtube', 'camera', 'video'].includes(next.type)) {
      try {
        next.url = next.type === 'youtube' ? youtubeUrl(next.url) : secureStreamUrl(next.url);
      } catch (error) {
        invalid.url = error.message;
      }
    }
    if (['poster', 'poster-next'].includes(next.type)) {
      if (!next.poster_ids?.length) invalid.poster_ids = 'Tick at least one poster to show.';
      if (
        !Number.isInteger(next.rotation_seconds) ||
        next.rotation_seconds < 5 ||
        next.rotation_seconds > 300
      )
        invalid.rotation_seconds = 'Choose between 5 and 300 seconds.';
    }
    if (next.type === 'text' && !next.text?.trim())
      invalid.text = 'Write the notice you want to show.';
    if (next.type === 'input') {
      next.name = next.name?.trim() || '';
      if (nameProblem(next.name, 'device name'))
        invalid.name = nameProblem(next.name, 'device name');
    }
    if (Object.keys(invalid).length) {
      setErrors(invalid);
      requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    let settings = {
      ...value,
      scenes: value.scenes.map((item) =>
        item.id === scene.id
          ? {
              ...scene,
              overlap: true,
              layers: scene.layers.map((item) => (item.id === next.id ? next : item)),
            }
          : item,
      ),
    };
    if (next.type === 'input') {
      settings = updateInputName(
        updateInputCapture(settings, next.slot, next.capture),
        next.slot,
        next.name,
      );
      onChange(settings);
      setDraft(next);
      setSavedInput(true);
    } else {
      onChange(settings);
      closeDialog();
    }
  }

  const errorFor = (field) =>
    errors[field] ? (
      <small id={`${editorId}-${field}-error`} className="admin-field-error" role="alert">
        {errors[field]}
      </small>
    ) : null;
  const fieldProps = (field) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${editorId}-${field}-error` : undefined,
  });

  return (
    <dialog
      ref={dialog}
      className="admin-edit-dialog scene-editor-dialog"
      aria-labelledby={`${editorId}-dialog-title`}
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
    >
      {draft && (
        <>
          <header className="scene-heading">
            <h3 id={`${editorId}-dialog-title`}>
              {draft.type === 'empty' ? 'Select input type' : 'Edit content'}
            </h3>
            <button
              className="admin-button"
              type="button"
              aria-label="Close content editor"
              onClick={closeDialog}
            >
              ×
            </button>
          </header>
          <form ref={form} className="scene-dialog-form" onSubmit={saveContent} noValidate>
            <fieldset className="scene-content-types" disabled={disabled}>
              <legend>What should this input show?</legend>
              {contentTypes.map(([type, name]) => (
                <button
                  key={type}
                  className={`admin-button ${typeOf(draft) === type ? 'primary' : ''}`}
                  type="button"
                  aria-pressed={typeOf(draft) === type}
                  {...fieldProps('type')}
                  onClick={() => {
                    if (typeOf(draft) !== type) chooseContent(type);
                  }}
                >
                  {name}
                </button>
              ))}
              {errorFor('type')}
            </fieldset>
            {['youtube', 'camera', 'video'].includes(draft.type) && (
              <label>
                {draft.type === 'youtube'
                  ? 'YouTube link'
                  : draft.type === 'video'
                    ? 'Saved video link'
                    : 'CCTV stream address'}
                <input
                  type="url"
                  disabled={disabled}
                  autoComplete="off"
                  required
                  value={draft.url || ''}
                  placeholder={
                    draft.type === 'youtube'
                      ? 'https://www.youtube.com/watch?v=…'
                      : draft.type === 'video'
                        ? 'https://…/video.mp4'
                        : 'https://…/camera.m3u8'
                  }
                  {...fieldProps('url')}
                  onChange={(event) => changeDraft({ ...draft, url: event.target.value })}
                />
                {errorFor('url')}
                {draft.type === 'video' && (
                  <small>Use a direct HTTPS video link, such as an MP4 file.</small>
                )}
              </label>
            )}
            {draft.type === 'camera' && (
              <label>
                Camera format
                <select
                  disabled={disabled}
                  value={draft.protocol}
                  onChange={(event) => changeDraft({ ...draft, protocol: event.target.value })}
                >
                  <option value="hls">HLS</option>
                  <option value="whep">WebRTC / WHEP</option>
                </select>
                <small>
                  Use a browser stream address. Local RTSP addresses need a camera gateway.
                </small>
              </label>
            )}
            {['poster', 'poster-next'].includes(draft.type) && (
              <fieldset className="scene-posters" disabled={disabled}>
                <legend>Choose posters</legend>
                <p>Tick one to keep it on screen, or several to rotate.</p>
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
                          checked={(draft.poster_ids || []).includes(poster.id)}
                          {...fieldProps('poster_ids')}
                          onChange={(event) =>
                            changeDraft({
                              ...draft,
                              poster_ids: event.target.checked
                                ? [...(draft.poster_ids || []), poster.id]
                                : (draft.poster_ids || []).filter((id) => id !== poster.id),
                            })
                          }
                        />
                        {poster.title}
                      </span>
                    </label>
                  ))}
                </div>
                {!posters.length && <p>No posters have been added yet.</p>}
                {errorFor('poster_ids')}
                <a href="/admin?section=posters" target="_blank" rel="noreferrer">
                  Add or edit posters ↗
                </a>
                <label>
                  Seconds between posters
                  <input
                    type="number"
                    min="5"
                    max="300"
                    required
                    value={draft.rotation_seconds ?? 20}
                    {...fieldProps('rotation_seconds')}
                    onChange={(event) =>
                      changeDraft({ ...draft, rotation_seconds: Number(event.target.value) })
                    }
                  />
                  {errorFor('rotation_seconds')}
                </label>
              </fieldset>
            )}
            {draft.type === 'input' && (
              <>
                <label>
                  Device name (required)
                  <input
                    disabled={disabled}
                    value={draft.name || ''}
                    maxLength={60}
                    placeholder="e.g. Haider’s iPhone or Classroom laptop"
                    {...fieldProps('name')}
                    onChange={(event) => changeDraft({ ...draft, name: event.target.value })}
                  />
                  <small>Use a name that helps you recognise this device.</small>
                </label>
                {errorFor('name')}
                {deviceSources.some(
                  (item) =>
                    item.slot !== draft.slot &&
                    item.capture === draft.capture &&
                    !scene.layers.some(
                      (candidate) =>
                        candidate.id !== draft.id &&
                        candidate.type === 'input' &&
                        candidate.slot === item.slot,
                    ),
                ) && (
                  <label>
                    Use a saved device
                    <select
                      disabled={disabled}
                      value={draft.slot}
                      onChange={(event) => {
                        const saved = deviceSources.find(
                          (item) => item.slot === event.target.value,
                        );
                        changeDraft({
                          ...draft,
                          slot: saved.slot,
                          name: saved.name || defaultName(draft.capture, saved.slot),
                        });
                      }}
                    >
                      <option value={draft.slot}>
                        {draft.name || defaultName(draft.capture, draft.slot)}
                      </option>
                      {deviceSources
                        .filter(
                          (item) =>
                            item.slot !== draft.slot &&
                            item.capture === draft.capture &&
                            !scene.layers.some(
                              (candidate) =>
                                candidate.id !== draft.id &&
                                candidate.type === 'input' &&
                                candidate.slot === item.slot,
                            ),
                        )
                        .map((item) => (
                          <option value={item.slot} key={item.slot}>
                            {inputLabel(item)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {!savedInput && <p>Save this content to show its sharing controls here.</p>}
              </>
            )}
            {draft.type === 'text' && (
              <label>
                Notice
                <textarea
                  rows={4}
                  required
                  maxLength={1200}
                  disabled={disabled}
                  value={draft.text || ''}
                  {...fieldProps('text')}
                  onChange={(event) => changeDraft({ ...draft, text: event.target.value })}
                />
                {errorFor('text')}
              </label>
            )}
            {draft.type === 'schedule' && (
              <p>This input uses the live video saved in the website’s livestream settings.</p>
            )}
            {'audio' in draft && (
              <label className="admin-check">
                <input
                  disabled={disabled}
                  type="checkbox"
                  checked={draft.audio}
                  onChange={(event) => changeDraft({ ...draft, audio: event.target.checked })}
                />
                Play this content’s audio
              </label>
            )}
            <details className="scene-position-details">
              <summary>Position and size</summary>
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
                      disabled={disabled}
                      min={['width', 'height'].includes(key) ? 5 : 0}
                      max="100"
                      step="1"
                      value={Math.round(draft[key] * 10) / 10}
                      onChange={(event) => {
                        if (event.target.value !== '')
                          changeDraft({
                            ...draft,
                            ...fitRect({ ...draft, [key]: Number(event.target.value) }),
                          });
                      }}
                    />
                  </label>
                ))}
              </div>
            </details>
            <div className="admin-edit-dialog-actions">
              <button type="button" className="admin-button" onClick={closeDialog}>
                Close
              </button>
              {layer?.type !== 'empty' && (
                <button
                  type="button"
                  className="admin-button"
                  disabled={disabled}
                  onClick={() => {
                    updateLayer(clearRegion(layer));
                    closeDialog();
                  }}
                >
                  Remove content
                </button>
              )}
              <button
                type="submit"
                className="admin-button primary"
                disabled={disabled || (savedInput && draft.type === 'input')}
              >
                {savedInput && draft.type === 'input' ? 'Content saved' : 'Save content'}
              </button>
            </div>
          </form>
          {draft.type === 'input' && savedInput && (
            <div ref={sharing} className="scene-device-controls">
              {renderDeviceInput?.(draft)}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
